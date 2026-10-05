import json
import logging
import random
import time
from typing import Any, Dict, List, Optional

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.ai_analysis import AIAnalysisResult
from app.schemas.ai_evidence import AIEvidencePackage
from app.services.ai.base import (
    BaseAIProvider,
    GroqConfigurationError,
    GroqRateLimitError,
    GroqTimeoutError,
    GroqServiceUnavailableError,
    AIAnalysisGenerationError,
)
from app.services.ai.openrouter_client import (
    SYSTEM_PROMPT_OPENROUTER,
    format_evidence_for_prompt,
    _strip_markdown_code_fences,
)

logger = logging.getLogger(__name__)

PROMPT_VERSION_V1 = "cp8-v1.3"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

_DEFAULT_KEY = object()


class GroqProvider(BaseAIProvider):
    """
    Groq AI reasoning provider using direct HTTP transport via httpx
    and response_format={"type": "json_object"}.
    """

    provider_name: str = "groq"

    def __init__(
        self,
        api_key: Optional[str] = _DEFAULT_KEY,
        model_name: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
        max_output_tokens: Optional[int] = None,
        http_client: Optional[httpx.Client] = None,
    ):
        self.api_key = settings.GROQ_API_KEY if api_key is _DEFAULT_KEY else api_key
        self.model_name = model_name or settings.GROQ_MODEL
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else settings.GROQ_TIMEOUT_SECONDS
        )
        self.max_retries = (
            max_retries if max_retries is not None else settings.GROQ_MAX_RETRIES
        )
        self.max_output_tokens = (
            max_output_tokens
            if max_output_tokens is not None
            else settings.GROQ_MAX_OUTPUT_TOKENS
        )
        self.http_client = http_client
        self.last_succeeded_model: Optional[str] = None
        self.last_usage: Optional[Dict[str, Any]] = None

    def analyze_project(
        self,
        evidence: AIEvidencePackage,
        prompt_version: str = PROMPT_VERSION_V1,
    ) -> AIAnalysisResult:
        """
        Execute structured project reasoning using Groq API over the configured model.

        Performs bounded retries on transient errors (transient 429 burst, 500, 502, 503, 504, timeout).
        Aborts immediately on non-transient errors (401, 403, 400, 404, quota exhaustion).
        Does not automatically switch models.
        """
        if not self.api_key or not self.api_key.strip():
            raise GroqConfigurationError(
                "Groq API key is not configured. Please set GROQ_API_KEY in the backend environment."
            )

        prompt_text = format_evidence_for_prompt(evidence)

        raw_response_content: Optional[str] = None
        last_exception: Optional[Exception] = None
        last_status_code: Optional[int] = None
        last_retry_after: Optional[float] = None
        attempt_log: List[str] = []

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT_OPENROUTER},
                {"role": "user", "content": prompt_text},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": self.max_output_tokens,
        }

        last_finish_reason: Optional[str] = None
        client_cm = (
            self.http_client
            if self.http_client is not None
            else httpx.Client(timeout=self.timeout_seconds)
        )

        try:
            max_attempts = self.max_retries + 1
            for attempt in range(max_attempts):
                try:
                    logger.info(
                        "Sending AI reasoning request to Groq (model: %s, attempt %d/%d, max_tokens: %d)",
                        self.model_name,
                        attempt + 1,
                        max_attempts,
                        self.max_output_tokens,
                    )

                    resp = client_cm.post(
                        GROQ_API_URL,
                        headers=headers,
                        json=payload,
                    )

                    status_code = resp.status_code
                    last_status_code = status_code

                    # 200 OK: Process successful response
                    if status_code == 200:
                        resp_json = resp.json()
                        choices = resp_json.get("choices") or []
                        if not choices:
                            raise AIAnalysisGenerationError(
                                "Groq returned empty choices in response."
                            )
                        choice_obj = choices[0]
                        message_obj = choice_obj.get("message") or {}
                        content = message_obj.get("content")
                        if not content or not content.strip():
                            raise AIAnalysisGenerationError(
                                "Groq returned empty content in response."
                            )

                        self.last_usage = resp_json.get("usage")

                        last_finish_reason = choice_obj.get("finish_reason")
                        if last_finish_reason == "length":
                            logger.error(
                                "Groq response was truncated because output token budget (%d) was reached.",
                                self.max_output_tokens,
                            )
                            raise AIAnalysisGenerationError(
                                f"Groq response was incomplete: finish_reason='length' reached output budget of {self.max_output_tokens} tokens. Truncated responses cannot be accepted as valid evaluations."
                            )

                        raw_response_content = content
                        self.last_succeeded_model = resp_json.get("model") or self.model_name
                        break

                    # Extract error text safely
                    error_message = resp.text
                    try:
                        error_body = resp.json()
                        if isinstance(error_body, dict):
                            err_val = error_body.get("error")
                            if isinstance(err_val, dict):
                                msg = str(err_val.get("message") or "")
                                failed_gen = err_val.get("failed_generation")
                                if failed_gen:
                                    msg = f"{msg} | failed_generation: {failed_gen}"
                                error_message = msg
                            elif isinstance(err_val, str):
                                error_message = err_val
                    except Exception:
                        pass

                    err_msg = error_message or resp.text

                    # 401 / 403: Permanent auth failure aborts immediately
                    if status_code in {401, 403}:
                        raise GroqConfigurationError(
                            f"Groq authentication failed (HTTP {status_code}): {err_msg}",
                            status_code=status_code,
                        )

                    # 400: Permanent client bad request aborts immediately
                    if status_code == 400:
                        raise AIAnalysisGenerationError(
                            f"Groq API client error (HTTP 400): {err_msg}",
                            status_code=400,
                        )

                    # 404: Model not found aborts immediately (no model switching)
                    if status_code == 404:
                        raise GroqConfigurationError(
                            f"Groq model '{self.model_name}' not found or unavailable (HTTP 404): {err_msg}",
                            status_code=404,
                        )

                    # 429: Rate limit or quota exhaustion
                    if status_code == 429:
                        err_lower = err_msg.lower()
                        is_quota = any(
                            k in err_lower
                            for k in (
                                "quota",
                                "credit",
                                "daily",
                                "exceeded",
                                "balance",
                                "free_tier",
                            )
                        )
                        if is_quota:
                            logger.warning(
                                "Model '%s' quota or credit exhausted on Groq (HTTP 429).",
                                self.model_name,
                            )
                            raise GroqRateLimitError(
                                f"Groq quota or credit exhausted for model '{self.model_name}' (HTTP 429): {err_msg}",
                                status_code=429,
                            )

                        # Transient burst rate limit: check Retry-After
                        retry_after_hdr = resp.headers.get("Retry-After")
                        retry_after_val: Optional[float] = None
                        if retry_after_hdr:
                            try:
                                retry_after_val = float(retry_after_hdr)
                            except ValueError:
                                pass
                        last_retry_after = retry_after_val

                        if attempt < self.max_retries:
                            if retry_after_val is not None and 0.0 < retry_after_val <= 10.0:
                                backoff = retry_after_val
                            else:
                                backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)

                            logger.warning(
                                "Transient rate limit on model '%s' (HTTP 429). Retrying in %.2fs (attempt %d/%d)...",
                                self.model_name,
                                backoff,
                                attempt + 1,
                                self.max_retries,
                            )
                            time.sleep(backoff)
                            continue

                        attempt_log.append(f"{self.model_name}: HTTP 429 burst limit exhausted")
                        break

                    # 500 / 502 / 503 / 504 / 408: Server errors are transient
                    if status_code in {408, 500, 502, 503, 504}:
                        if attempt < self.max_retries:
                            backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                            logger.warning(
                                "Groq server error (HTTP %d) on model '%s'. Retrying in %.2fs (attempt %d/%d)...",
                                status_code,
                                self.model_name,
                                backoff,
                                attempt + 1,
                                self.max_retries,
                            )
                            time.sleep(backoff)
                            continue

                        attempt_log.append(f"{self.model_name}: HTTP {status_code} exhausted")
                        break

                    # Any other unexpected status code
                    raise AIAnalysisGenerationError(
                        f"Unexpected HTTP {status_code} from Groq: {err_msg}",
                        status_code=status_code,
                    )

                except httpx.TimeoutException as te:
                    last_exception = te
                    last_status_code = 504
                    if attempt < self.max_retries:
                        backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                        logger.warning(
                            "Groq timeout on model '%s'. Retrying in %.2fs (attempt %d/%d)...",
                            self.model_name,
                            backoff,
                            attempt + 1,
                            self.max_retries,
                        )
                        time.sleep(backoff)
                        continue
                    attempt_log.append(f"{self.model_name}: timeout exhausted")
                    break

                except httpx.NetworkError as ne:
                    last_exception = ne
                    last_status_code = 503
                    if attempt < self.max_retries:
                        backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                        logger.warning(
                            "Groq network error on model '%s'. Retrying in %.2fs (attempt %d/%d)...",
                            self.model_name,
                            backoff,
                            attempt + 1,
                            self.max_retries,
                        )
                        time.sleep(backoff)
                        continue
                    attempt_log.append(f"{self.model_name}: network error exhausted")
                    break

        finally:
            if self.http_client is None:
                client_cm.close()

        # If no raw response content was acquired
        if raw_response_content is None:
            if isinstance(last_exception, httpx.TimeoutException):
                raise GroqTimeoutError(
                    f"Groq timeout on model '{self.model_name}' (log: {'; '.join(attempt_log)}): {str(last_exception)}",
                    status_code=504,
                )
            if last_status_code == 429:
                err_summary = f"Groq rate limit reached (HTTP 429) on model '{self.model_name}': {'; '.join(attempt_log)}"
                raise GroqRateLimitError(
                    err_summary,
                    status_code=429,
                    retry_after=last_retry_after,
                )
            if last_status_code in {408, 500, 502, 503, 504}:
                raise GroqServiceUnavailableError(
                    f"Groq service unavailable (HTTP {last_status_code}) on model '{self.model_name}' (log: {'; '.join(attempt_log)})",
                    status_code=last_status_code,
                )
            raise AIAnalysisGenerationError(
                f"Failed to generate AI analysis on Groq model '{self.model_name}' (log: {'; '.join(attempt_log)}): {str(last_exception)}"
            )

        # -----------------------------------------------------------------
        # OUTSIDE RETRY LOOP:
        # Markdown fence stripping & Pydantic validation strictly once.
        # Malformed model output or schema invalidity fails immediately without retry.
        # -----------------------------------------------------------------
        cleaned_json_text = _strip_markdown_code_fences(raw_response_content)

        try:
            return AIAnalysisResult.model_validate_json(cleaned_json_text)
        except (ValidationError, json.JSONDecodeError, ValueError) as e:
            truncation_notice = ""
            if last_finish_reason == "length":
                truncation_notice = f" (response truncated: finish_reason='length' reached output budget of {self.max_output_tokens} tokens)"
            raise AIAnalysisGenerationError(
                f"AI reasoning response failed schema validation or contained malformed JSON{truncation_notice}: {str(e)}"
            ) from e

    def evaluate_defend_attempt(self, evidence_context: dict, question: str, student_answer: str) -> dict:
        import json
        import httpx
        
        prompt_text = self.build_defend_prompt(evidence_context, question, student_answer)
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }
        
        client_cm = (
            self.http_client
            if self.http_client is not None
            else httpx.Client(timeout=self.timeout_seconds)
        )
        
        try:
            resp = client_cm.post(
                GROQ_API_URL,
                headers=headers,
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": prompt_text}],
                    "response_format": {"type": "json_object"}
                }
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_text)
            return {"feedback": self.format_defend_feedback(parsed, evidence_context)}
        except Exception as e:
            logger.error(f"Groq error generating defend feedback: {e}")
            raise
        finally:
            if self.http_client is None:
                client_cm.close()

    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        import json
        import httpx
        
        prompt_text = self.build_defend_questions_prompt(evidence_package)
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }
        
        client_cm = (
            self.http_client
            if self.http_client is not None
            else httpx.Client(timeout=self.timeout_seconds)
        )
        
        try:
            resp = client_cm.post(
                GROQ_API_URL,
                headers=headers,
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": prompt_text}],
                    "response_format": {"type": "json_object"}
                }
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_text)
            return self.parse_and_validate_defend_questions(parsed, evidence_package)
        except Exception as e:
            logger.error(f"Groq error generating defend questions: {e}")
            raise
        finally:
            if self.http_client is None:
                client_cm.close()

    def generate_session_recap(self, answered_data: list[dict]) -> dict:
        import json
        import httpx
        
        prompt_text = f"""You are an expert evaluator assessing a student's software project defense.
Review the following Q&A session. Summarize the student's overall performance.
Include qualitative observations across project understanding, flow explanation, technical clarity, use of relevant details, and evidence awareness. Summarize strengths and a few practical areas to work on next.
If unanswered questions were skipped, do not imply they were completed.

Session Data:
{json.dumps(answered_data, indent=2)}

Return ONLY a valid JSON object matching this exact schema:
{{
    "recap": "<your detailed summary recap>"
}}
"""
        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json"
        }
        
        client_cm = (
            self.http_client
            if self.http_client is not None
            else httpx.Client(timeout=self.timeout_seconds)
        )
        
        try:
            resp = client_cm.post(
                GROQ_API_URL,
                headers=headers,
                json={
                    "model": self.model_name,
                    "messages": [{"role": "user", "content": prompt_text}],
                    "response_format": {"type": "json_object"}
                }
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["choices"][0]["message"]["content"]
            parsed = json.loads(raw_text)
            return {"recap": parsed.get("recap", "No recap generated.")}
        except Exception as e:
            logger.error(f"Groq error generating session recap: {e}")
            raise
        finally:
            if self.http_client is None:
                client_cm.close()
