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

PROMPT_VERSION_V1 = "cp8-v1.0"

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
11. If evidence is inadequate to assess scalability, security, or performance, flag it as an explicit evidence gap rather than guessing.
12. Return your output strictly complying with the requested JSON schema.
"""


def format_evidence_for_prompt(evidence: AIEvidencePackage) -> str:
    """Format the bounded evidence package into clean JSON text for the model prompt."""
    evidence_dict = evidence.model_dump(mode="json")
    return (
        "Here is the structured project evidence package for technical evaluation:\n\n"
        + json.dumps(evidence_dict, indent=2, ensure_ascii=False)
        + "\n\nAnalyze this structured evidence package according to your instructions and return the structured evaluation result."
    )


class GeminiProvider(BaseAIProvider):
    """Official Google GenAI SDK provider with lazy client initialization and retry logic."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
    ):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_MODEL
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else settings.GEMINI_TIMEOUT_SECONDS
        )
        self.max_retries = (
            max_retries if max_retries is not None else settings.GEMINI_MAX_RETRIES
        )

    def analyze_project(
        self,
        evidence: AIEvidencePackage,
        prompt_version: str = PROMPT_VERSION_V1,
    ) -> AIAnalysisResult:
        """
        Execute structured project reasoning using Google Gemini.

        Retries transient failures (429, 503, 504, timeout) up to max_retries
        with exponential backoff and random jitter.
        Non-transient errors (400, 401, 403, 404, validation errors) abort immediately.
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

        last_exception: Optional[Exception] = None
        max_attempts = self.max_retries + 1
        raw_response = None

        for attempt in range(max_attempts):
            try:
                logger.info(
                    "Sending AI reasoning request to Gemini (model: %s, attempt %d/%d)",
                    self.model_name,
                    attempt + 1,
                    max_attempts,
                )

                raw_response = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt_text,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=AIAnalysisResult,
                    ),
                )
                # Successful external call -> exit retry loop
                break

            except genai_errors.APIError as e:
                last_exception = e
                status_code = getattr(e, "code", 500)

                # Classify transient vs non-transient external failures
                is_rate_limit = status_code == 429
                is_server_error = status_code in {503, 504}
                is_transient = is_rate_limit or is_server_error

                if is_transient and attempt < self.max_retries:
                    backoff = min(2.0 ** attempt + random.uniform(0.1, 0.5), 8.0)
                    logger.warning(
                        "Transient Gemini API error (status %d). Retrying in %.2fs (attempt %d/%d)...",
                        status_code,
                        backoff,
                        attempt + 1,
                        self.max_retries,
                    )
                    time.sleep(backoff)
                    continue

                if is_rate_limit:
                    raise GeminiRateLimitError(
                        f"Gemini API rate limit reached (HTTP 429): {str(e)}",
                        status_code=429,
                    ) from e
                if is_server_error:
                    raise GeminiServiceUnavailableError(
                        f"Gemini service unavailable (HTTP {status_code}): {str(e)}",
                        status_code=status_code,
                    ) from e

                # Non-transient errors (400, 401, 403, 404, etc.) must abort immediately
                raise AIAnalysisGenerationError(
                    f"Gemini API error (HTTP {status_code}): {str(e)}",
                    status_code=status_code,
                ) from e

            except (httpx.TimeoutException, TimeoutError) as e:
                last_exception = e
                if attempt < self.max_retries:
                    backoff = min(2.0 ** attempt + random.uniform(0.1, 0.5), 8.0)
                    logger.warning(
                        "Gemini API timeout. Retrying in %.2fs (attempt %d/%d)...",
                        backoff,
                        attempt + 1,
                        self.max_retries,
                    )
                    time.sleep(backoff)
                    continue
                raise GeminiTimeoutError(
                    f"Gemini request timed out after {self.timeout_seconds}s.",
                    status_code=504,
                ) from e

            except Exception as e:
                # Network / connection timeout conditions
                err_str = str(e).lower()
                is_timeout = "timeout" in err_str
                is_conn = "connection" in err_str
                if (is_timeout or is_conn) and attempt < self.max_retries:
                    last_exception = e
                    backoff = min(2.0 ** attempt + random.uniform(0.1, 0.5), 8.0)
                    logger.warning(
                        "Transient network error (%s). Retrying in %.2fs (attempt %d/%d)...",
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

        if raw_response is None:
            raise AIAnalysisGenerationError(
                f"Failed to generate AI analysis after {max_attempts} attempts: {str(last_exception)}"
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
