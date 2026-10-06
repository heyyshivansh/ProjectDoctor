import json
import logging
import random
import time
from typing import Optional

from google import genai
from google.genai import types
from google.genai import errors as genai_errors
import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.ai_analysis import AIAnalysisResult
from app.schemas.ai_evidence import AIEvidencePackage
from app.services.ai.base import (
    BaseAIProvider,
    GeminiConfigurationError,
    GeminiRateLimitError,
    GeminiServiceUnavailableError,
    GeminiTimeoutError,
    AIAnalysisGenerationError,
)

logger = logging.getLogger(__name__)

PROMPT_VERSION_V1 = "cp8-v1.3"

SYSTEM_PROMPT_V1 = """You are the AI Reasoning Engine of Project Doctor, an AI-assisted technical project evaluator designed for college student projects.
Your role is to perform rigorous, evidence-backed evaluation over supplied project facts.

You must follow these 12 INVARIANT RULES:
1. Ground every claim strictly in the supplied structured evidence. Never invent or assume unstated project facts.
2. Distinguish clearly between FACT (directly stated in evidence), INTERPRETATION (technical meaning of the fact), INFERENCE (reasonable technical deduction), and UNCERTAINTY (what cannot be verified).
3. Explicitly state uncertainty when evidence is incomplete, ambiguous, or absent.
4. Never treat filename similarity as proof of implementation correctness.
5. Never claim implementation correctness from candidate evidence alone.
6. Do not contradict or silently override deterministic diagnostic findings.
7. Do not invent missing test results, architecture components, or benchmark data.
8. If a claimed feature is missing from the repository, state that "No supporting implementation evidence was found in the analyzed repository snapshot" rather than claiming it definitely does not exist.
9. For every observation, inconsistency, or gap, cite the supplied canonical evidence references with exact target_type, target_id (UUID if available), and identifier.
10. Identify discrepancies between documentation promises and repository reality without derogatory language.
11. If evidence is inadequate to assess architecture, frontend, backend, implementation, security, testing, deployment, documentation, or scalability, flag it as an explicit evidence gap rather than guessing. Prefer specific areas ('frontend', 'backend') over generic 'implementation' when the gap relates specifically to client-side UI or server API/data layers.
12. Return your output strictly complying with the requested JSON schema.
"""


def _prune_empty_fields(obj):
    """Recursively prune None, empty strings, empty lists, and empty dicts to conserve prompt tokens."""
    if isinstance(obj, dict):
        return {
            k: _prune_empty_fields(v)
            for k, v in obj.items()
            if v is not None and v != "" and v != [] and v != {}
        }
    elif isinstance(obj, list):
        return [_prune_empty_fields(v) for v in obj]
    return obj


def format_evidence_for_prompt(evidence: AIEvidencePackage) -> str:
    """Format the bounded evidence package into clean, pruned JSON text for the model prompt."""
    evidence_dict = evidence.model_dump(mode="json")
    pruned_dict = _prune_empty_fields(evidence_dict)
    return (
        "Here is the structured project evidence package for technical evaluation:\n\n"
        + json.dumps(pruned_dict, indent=2, ensure_ascii=False)
        + "\n\nAnalyze this structured evidence package according to your instructions and return the structured evaluation result."
    )


_DEFAULT_KEY = object()


class GeminiProvider(BaseAIProvider):
    """Official Google GenAI SDK provider with multi-model fallback and resilient retry logic."""

    provider_name: str = "gemini"

    def __init__(
        self,
        api_key: Optional[str] = _DEFAULT_KEY,
        model_name: Optional[str] = None,
        fallback_models: Optional[List[str]] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
    ):
        self.api_key = settings.GEMINI_API_KEY if api_key is _DEFAULT_KEY else api_key
        self.model_name = model_name or settings.GEMINI_MODEL
        self.fallback_models = (
            fallback_models
            if fallback_models is not None
            else list(settings.GEMINI_FALLBACK_MODELS)
        )
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else settings.GEMINI_TIMEOUT_SECONDS
        )
        self.max_retries = (
            max_retries if max_retries is not None else settings.GEMINI_MAX_RETRIES
        )
        self.last_succeeded_model: Optional[str] = None

    def analyze_project(
        self,
        evidence: AIEvidencePackage,
        prompt_version: str = PROMPT_VERSION_V1,
    ) -> AIAnalysisResult:
        """
        Execute structured project reasoning using Google Gemini.

        Tries primary model followed by fallback models.
        Retries transient failures (429, 500, 502, 503, 504, timeout) up to max_retries
        per model with exponential backoff and random jitter.
        Non-transient errors (401, 403, 400, validation errors) abort immediately.
        Model 404 (unavailable/unsupported model name) moves immediately to fallback models.
        """
        if not self.api_key or not self.api_key.strip():
            raise GeminiConfigurationError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in the backend environment."
            )

        # Lazy initialization of genai.Client with milliseconds timeout
        timeout_ms = int(self.timeout_seconds * 1000)
        client = genai.Client(
            api_key=self.api_key.strip(),
            http_options=types.HttpOptions(timeout=timeout_ms),
        )

        prompt_text = format_evidence_for_prompt(evidence)
        system_instruction = SYSTEM_PROMPT_V1

        # Formulate candidate models: primary first, followed by fallbacks without duplicates
        candidates = [self.model_name] + [
            m for m in self.fallback_models if m != self.model_name
        ]

        raw_response = None
        last_exception: Optional[Exception] = None
        last_status_code: Optional[int] = None
        attempt_log: List[str] = []

        for model_idx, current_model in enumerate(candidates):
            logger.info(
                "Attempting AI reasoning with model '%s' (candidate %d/%d)",
                current_model,
                model_idx + 1,
                len(candidates),
            )
            model_succeeded = False
            max_attempts = self.max_retries + 1

            for attempt in range(max_attempts):
                try:
                    logger.info(
                        "Sending AI reasoning request to Gemini (model: %s, attempt %d/%d)",
                        current_model,
                        attempt + 1,
                        max_attempts,
                    )

                    raw_response = client.models.generate_content(
                        model=current_model,
                        contents=prompt_text,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type="application/json",
                            response_schema=AIAnalysisResult,
                        ),
                    )
                    self.last_succeeded_model = current_model
                    model_succeeded = True
                    break

                except genai_errors.APIError as e:
                    last_exception = e
                    status_code = getattr(e, "code", 500)
                    last_status_code = status_code

                    # Permanent authentication error aborts immediately across all models
                    if status_code in {401, 403}:
                        raise GeminiConfigurationError(
                            f"Gemini API authentication failed (HTTP {status_code}): {str(e)}",
                            status_code=status_code,
                        ) from e

                    # Model not available or not found for this key: move to fallback model
                    if status_code == 404:
                        logger.warning(
                            "Model '%s' not found or unavailable for this API key (HTTP 404). Trying next fallback model.",
                            current_model,
                        )
                        attempt_log.append(f"{current_model}: HTTP 404 not found")
                        break

                    # Permanent client bad request: abort immediately
                    if status_code == 400:
                        raise AIAnalysisGenerationError(
                            f"Gemini API error (HTTP 400): {str(e)}",
                            status_code=400,
                        ) from e

                    # 429: Check if caused by daily or request quota exhaustion (non-transient for this model)
                    if status_code == 429:
                        err_msg = str(e).lower()
                        is_quota_exhaustion = any(
                            keyword in err_msg
                            for keyword in (
                                "quota",
                                "resource_exhausted",
                                "day",
                                "daily",
                                "free_tier",
                                "generaterequests",
                                "billing",
                            )
                        )
                        if is_quota_exhaustion:
                            logger.warning(
                                "Model '%s' quota exhausted (HTTP 429). Skipping retries on this model and advancing to next fallback candidate.",
                                current_model,
                            )
                            attempt_log.append(f"{current_model}: HTTP 429 quota exhausted")
                            break

                        # Transient rate limit (e.g. concurrency / burst): bounded exponential backoff
                        if attempt < self.max_retries:
                            backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                            logger.warning(
                                "Transient rate limit on model '%s' (HTTP 429). Retrying in %.2fs (attempt %d/%d)...",
                                current_model,
                                backoff,
                                attempt + 1,
                                self.max_retries,
                            )
                            time.sleep(backoff)
                            continue

                        attempt_log.append(f"{current_model}: HTTP 429 exhausted")
                        break

                    # 408, 500, 502, 503, 504: Transient server errors / temporary overload
                    is_transient = status_code in {408, 500, 502, 503, 504}
                    if is_transient and attempt < self.max_retries:
                        backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                        logger.warning(
                            "Transient Gemini API error on model '%s' (status %d). Retrying in %.2fs (attempt %d/%d)...",
                            current_model,
                            status_code,
                            backoff,
                            attempt + 1,
                            self.max_retries,
                        )
                        time.sleep(backoff)
                        continue

                    # If retries exhausted on this model, record and try next fallback
                    attempt_log.append(f"{current_model}: HTTP {status_code} exhausted")
                    logger.warning(
                        "Retries exhausted for model '%s' on status %d. Checking for fallback model...",
                        current_model,
                        status_code,
                    )
                    break

                except (httpx.TimeoutException, TimeoutError) as e:
                    last_exception = e
                    last_status_code = 504
                    if attempt < self.max_retries:
                        backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                        logger.warning(
                            "Gemini API timeout on model '%s'. Retrying in %.2fs (attempt %d/%d)...",
                            current_model,
                            backoff,
                            attempt + 1,
                            self.max_retries,
                        )
                        time.sleep(backoff)
                        continue
                    attempt_log.append(f"{current_model}: timeout exhausted")
                    break

                except Exception as e:
                    err_str = str(e).lower()
                    is_timeout = "timeout" in err_str
                    is_conn = "connection" in err_str
                    if (is_timeout or is_conn) and attempt < self.max_retries:
                        last_exception = e
                        backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                        logger.warning(
                            "Transient network error on model '%s' (%s). Retrying in %.2fs (attempt %d/%d)...",
                            current_model,
                            err_str[:100],
                            backoff,
                            attempt + 1,
                            self.max_retries,
                        )
                        time.sleep(backoff)
                        continue
                    raise AIAnalysisGenerationError(
                        f"Unexpected error during Gemini analysis: {str(e)}"
                    ) from e

            if model_succeeded:
                break

        if raw_response is None:
            if last_status_code == 429:
                raise GeminiRateLimitError(
                    f"Gemini API rate limit reached (HTTP 429) across models {candidates}: {str(last_exception)}",
                    status_code=429,
                )
            if last_status_code in {408, 500, 502, 503, 504}:
                raise GeminiServiceUnavailableError(
                    f"Gemini service unavailable (HTTP {last_status_code}) across models {candidates}: {str(last_exception)}",
                    status_code=last_status_code,
                )
            raise AIAnalysisGenerationError(
                f"Failed to generate AI analysis across models {candidates} (log: {'; '.join(attempt_log)}): {str(last_exception)}"
            )

        # -----------------------------------------------------------------
        # OUTSIDE RETRY LOOP:
        # Pydantic validation & JSON parsing executed strictly once.
        # Malformed model output or schema invalidity fails immediately without retry.
        # -----------------------------------------------------------------
        response_text = getattr(raw_response, "text", None)
        if not response_text or not response_text.strip():
            raise AIAnalysisGenerationError("Gemini returned an empty response.")

        try:
            return AIAnalysisResult.model_validate_json(response_text)
        except (ValidationError, json.JSONDecodeError, ValueError) as e:
            raise AIAnalysisGenerationError(
                f"AI reasoning response failed schema validation or contained malformed JSON: {str(e)}"
            ) from e

    def evaluate_defend_attempt(self, evidence_context: dict, question: str, student_answer: str) -> dict:
        import json
        from google import genai
        from google.genai import types
        
        prompt_text = self.build_defend_prompt(evidence_context, question, student_answer)
        
        client = genai.Client(api_key=self.api_key.strip())
        
        try:
            resp = client.models.generate_content(
                model=self.model_name,
                contents=prompt_text,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            parsed = json.loads(resp.text)
            return {"feedback": self.format_defend_feedback(parsed, evidence_context)}
        except Exception as e:
            logger.error(f"Gemini error generating defend feedback: {e}")
            raise

    def generate_defend_questions(self, evidence_package: dict) -> list[dict]:
        import json
        from google import genai
        from google.genai import types
        prompt_text = self.build_defend_questions_prompt(evidence_package)
        client = genai.Client(api_key=self.api_key.strip())
        resp = client.models.generate_content(
            model=self.model_name,
            contents=prompt_text,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        parsed = json.loads(resp.text)
        return self.parse_and_validate_defend_questions(parsed, evidence_package)
