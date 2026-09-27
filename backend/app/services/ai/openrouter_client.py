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
    OpenRouterConfigurationError,
    OpenRouterRateLimitError,
    OpenRouterTimeoutError,
    OpenRouterServiceUnavailableError,
    AIAnalysisGenerationError,
)

logger = logging.getLogger(__name__)

PROMPT_VERSION_V1 = "cp8-v1.3"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT_OPENROUTER = """You are the AI Reasoning Engine of Project Doctor, an AI-assisted technical project evaluator designed for college student engineering projects.

AUTHORITATIVE ARCHITECTURAL PRINCIPLE:
Deterministic systems establish facts. AI reasons over structured evidence.
You are NOT a generic chatbot, tutor, or code summarizer. You are an expert technical evaluator and jury defense preparation engine.

YOUR EVALUATION OBJECTIVES:
Help the student and examiners answer:
1. What is actually implemented in the repository snapshot?
2. What is missing, unverified, or insufficiently evidenced?
3. What is inconsistent between specifications/documentation and repository implementation?
4. Why does each identified gap or inconsistency matter from an engineering standpoint?
5. How can the student prove that their implementation works?
6. What specific evidence or defense will satisfy a rigorous technical jury or examiner?

CORE REASONING PATTERN TO ENFORCE:
Conclusion -> Why It Matters -> Evidence -> What to Do / Possible Jury Question

STRICT NEGATIVE RULES (DO NOT VIOLATE):
1. NO GENERIC PROSE OR ADVICE: Do NOT provide generic textbook advice (e.g., 'consider writing tests', 'security is critical', 'apply proper error handling') or motivational filler.
2. NO DETERMINISTIC FACT REPETITION: Do NOT merely state that a file exists without technical interpretation (e.g., do not say 'auth.py exists in the repository'). Explain its architectural role, significance, or discrepancy with requirements.
3. NO PRAISE OR CRITICISM WITHOUT EVIDENCE: Every evaluation statement must be strictly grounded in and cited against the provided evidence package.
4. NO ARBITRARY QUALITY SCORES: Never invent numeric ratings, percentages, or letter grades.
5. PREFER EMPTY ARRAYS OVER FILLER: If no genuine contradictions, evidence gaps, or correlations exist supported by evidence, return an empty array `[]`. A tight, 100% grounded response is vastly superior to filler.

STRICT EVIDENCE CITATION INVARIANTS:
1. target_type 'artifact': ONLY cite this if referencing an uploaded document in evidence.artifacts. target_id MUST be the exact UUID string from artifacts. identifier MUST be the exact filename. NEVER use for repo files. NEVER use 'None', 'null', or invented UUIDs.
2. target_type 'repository_file': identifier MUST be an exact literal file path present in directory_tree, manifests, entrypoints, or indexed repository files (e.g. 'backend/app/main.py'). NEVER use wildcard glob patterns (e.g. 'backend/test_*.py'), NEVER use aggregate count descriptions (e.g. 'backend/test_*.py (16 files)'), and NEVER use directory paths alone. Cite specific, literal file paths.
3. target_type 'requirement': target_id MUST be the requirement's exact UUID string, and identifier MUST be its canonical code (e.g. 'REQ-001').
4. target_type 'finding': target_id MUST be the exact diagnostic finding UUID, and identifier MUST be its finding_hash or title.
5. NEVER FABRICATE CITATIONS: If an observation or claim cannot be cited with real entities from the provided evidence, state the lack of evidence explicitly in uncertainty_notes or omit the observation entirely. Do not guess identifiers.

STRICT OUTPUT SIZE & CONCISENESS LIMITS:
To prevent response truncation and ensure razor-sharp focus on evidence:
- observations: Maximum 2-3 high-signal items. Keep statements and technical rationales to 2-3 sentences each.
- cross_artifact_correlations: Maximum 1-2 items (or [] if evidence is insufficient).
- contradictions: Maximum 1-2 items (or [] if no contradictions exist).
- evidence_gaps: Maximum 2 items. Use specific areas ('frontend', 'backend') before generic 'implementation' when the gap relates specifically to client-side UI or server API/data layers.
- diagnostic_interpretations: Include only for findings present in the evidence package.
- uncertainty_notes: Maximum 1-2 concise bullet points.
Total JSON output must be compact (under 1,500 tokens). Never write long essays or filler.

REQUIRED JSON OUTPUT FORMAT (return ONLY a single valid JSON object, no markdown fences):
{
  "analysis_summary": "<Executive technical synthesis of project coherence, maturity, and readiness>",
  "project_understanding": {
    "summary": "<Synthesized description of project purpose grounded in evidence>",
    "primary_purpose": "<Core problem being solved>",
    "target_users_identified": ["<user category>"],
    "key_capabilities_claimed": ["<stated capability>"],
    "evidence_basis": "<Summary of documentation and repo evidence supporting this understanding>",
    "confidence": "high"|"medium"|"low"
  },
  "observations": [
    {
      "observation_type": "fact"|"interpretation"|"inference"|"uncertainty",
      "category": "architecture"|"implementation"|"verification"|"specification"|"security",
      "title": "<Concise descriptive title>",
      "statement": "<Detailed observation statement>",
      "technical_rationale": "<Why this observation matters from an engineering/evaluation perspective>",
      "evidence_citations": [
        {
          "target_type": "requirement"|"repository_file"|"finding"|"artifact"|"traceability",
          "target_id": "<UUID string or null>",
          "identifier": "<Canonical human-readable identifier (e.g. REQ-001, backend/app/main.py, finding_hash)>",
          "detail": "<Brief supporting context or null>"
        }
      ],
      "confidence": "high"|"medium"|"low"
    }
  ],
  "cross_artifact_correlations": [
    {
      "claim_source": "<Specification claim reference, e.g. SRS / REQ-002>",
      "implementation_evidence": "<Repository evidence found, or 'none' if unsupported>",
      "correlation_status": "supported"|"partially_supported"|"unsupported"|"ambiguous",
      "explanation": "<Uncertainty-aware explanation of alignment between claim and code>",
      "citations": []
    }
  ],
  "contradictions": [
    {
      "headline": "<Summary of contradiction>",
      "specification_claim": "<What the specification/document claims>",
      "repository_reality": "<What was observed or not observed in repository evidence>",
      "discrepancy_explanation": "<Uncertainty-aware explanation>",
      "severity_assessment": "major"|"moderate"|"minor",
      "citations": []
    }
  ],
  "evidence_gaps": [
    {
      "area": "architecture"|"frontend"|"backend"|"implementation"|"security"|"testing"|"deployment"|"documentation"|"scalability",
      "missing_evidence_description": "<What specific evidence is missing or cannot be evaluated>",
      "why_needed": "<Why an evaluator needs this evidence>",
      "recommended_evidence": "<Concrete artifacts or repository evidence the team should provide>"
    }
  ],
  "diagnostic_interpretations": [
    {
      "finding_id": "<UUID string of matching finding, or null>",
      "finding_title": "<Title of the deterministic finding>",
      "project_context_impact": "<AI explanation of what this finding means in context>",
      "uncertainty_note": null
    }
  ],
  "uncertainty_notes": [
    "<Explicit note describing what could not be verified from available evidence>"
  ]
}
"""


def _prune_empty_fields(obj: Any) -> Any:
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
    """Format the bounded evidence package into clean, compact JSON text for the model prompt."""
    evidence_dict = evidence.model_dump(mode="json")
    pruned_dict = _prune_empty_fields(evidence_dict)
    compact_json = json.dumps(pruned_dict, separators=(",", ":"), ensure_ascii=False)
    return (
        "Here is the structured project evidence package for technical evaluation:\n\n"
        + compact_json
        + "\n\nAnalyze this structured evidence package according to your instructions and return the structured evaluation result."
    )


def _strip_markdown_code_fences(content: str) -> str:
    """Strip markdown code block fences if returned by the language model."""
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


_DEFAULT_KEY = object()


class OpenRouterProvider(BaseAIProvider):
    """OpenRouter reasoning provider using httpx and response_format={"type": "json_object"}."""

    provider_name: str = "openrouter"

    def __init__(
        self,
        api_key: Optional[str] = _DEFAULT_KEY,
        model_name: Optional[str] = None,
        fallback_models: Optional[List[str]] = None,
        timeout_seconds: Optional[float] = None,
        max_retries: Optional[int] = None,
        http_client: Optional[httpx.Client] = None,
    ):
        self.api_key = settings.OPENROUTER_API_KEY if api_key is _DEFAULT_KEY else api_key
        self.model_name = model_name or settings.OPENROUTER_MODEL
        self.fallback_models = (
            fallback_models
            if fallback_models is not None
            else list(settings.OPENROUTER_FALLBACK_MODELS)
        )
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else settings.OPENROUTER_TIMEOUT_SECONDS
        )
        self.max_retries = (
            max_retries if max_retries is not None else settings.OPENROUTER_MAX_RETRIES
        )
        self.http_client = http_client
        self.last_succeeded_model: Optional[str] = None

    def analyze_project(
        self,
        evidence: AIEvidencePackage,
        prompt_version: str = PROMPT_VERSION_V1,
    ) -> AIAnalysisResult:
        """
        Execute structured project reasoning using OpenRouter.

        Tries primary model followed by explicitly configured fallback models.
        Retries transient failures (429 burst, 500, 502, 503, 504, timeout) up to max_retries
        per model with exponential backoff and random jitter.
        Non-transient errors (401, 403, 402, 400, quota exhaustion) abort or advance immediately.
        """
        if not self.api_key or not self.api_key.strip():
            raise OpenRouterConfigurationError(
                "OpenRouter API key is not configured. Please set OPENROUTER_API_KEY in the backend environment."
            )

        prompt_text = format_evidence_for_prompt(evidence)

        # Candidates: primary model first, followed by explicitly configured fallbacks
        candidates = [self.model_name] + [
            m for m in self.fallback_models if m != self.model_name
        ]

        raw_response_content: Optional[str] = None
        last_exception: Optional[Exception] = None
        last_status_code: Optional[int] = None
        last_limit_source: Optional[str] = None
        last_provider_name: Optional[str] = None
        last_remedy_hint: Optional[str] = None
        last_raw_err: Optional[str] = None
        attempt_log: List[str] = []

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/projectdoctor/projectdoctor",
            "X-Title": "Project Doctor",
        }

        # Use injected client if provided (for testing), else instantiate one
        client_cm = (
            self.http_client
            if self.http_client is not None
            else httpx.Client(timeout=self.timeout_seconds)
        )

        try:
            for model_idx, current_model in enumerate(candidates):
                logger.info(
                    "Attempting AI reasoning via OpenRouter with model '%s' (candidate %d/%d)",
                    current_model,
                    model_idx + 1,
                    len(candidates),
                )
                model_succeeded = False
                max_attempts = self.max_retries + 1

                payload = {
                    "model": current_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT_OPENROUTER},
                        {"role": "user", "content": prompt_text},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                }

                for attempt in range(max_attempts):
                    try:
                        logger.info(
                            "Sending AI reasoning request to OpenRouter (model: %s, attempt %d/%d)",
                            current_model,
                            attempt + 1,
                            max_attempts,
                        )

                        resp = client_cm.post(
                            OPENROUTER_API_URL,
                            headers=headers,
                            json=payload,
                        )

                        status_code = resp.status_code
                        last_status_code = status_code

                        # Successful response
                        if status_code == 200:
                            resp_json = resp.json()
                            choices = resp_json.get("choices") or []
                            if not choices:
                                raise AIAnalysisGenerationError(
                                    "OpenRouter returned empty choices in response."
                                )
                            message_obj = choices[0].get("message") or {}
                            content = message_obj.get("content")
                            if not content or not content.strip():
                                raise AIAnalysisGenerationError(
                                    "OpenRouter returned empty content in response."
                                )

                            raw_response_content = content
                            # Capture actual returned model if available from OpenRouter response
                            self.last_succeeded_model = resp_json.get("model") or current_model
                            model_succeeded = True
                            break

                        # Extract structured error information from response body
                        error_message = resp.text
                        metadata: Dict[str, Any] = {}
                        limit_source: Optional[str] = None
                        provider_name: Optional[str] = None
                        raw_msg: str = ""
                        remedy_hint: str = ""

                        try:
                            error_body = resp.json()
                            if isinstance(error_body, dict):
                                err_val = error_body.get("error")
                                if isinstance(err_val, dict):
                                    error_message = str(err_val.get("message") or "")
                                    meta_val = err_val.get("metadata")
                                    if isinstance(meta_val, dict):
                                        metadata = meta_val
                                        limit_source = metadata.get("limit_source")
                                        provider_name = metadata.get("provider_name")
                                        raw_msg = str(metadata.get("raw") or "")
                                        remedy_hint = str(metadata.get("remedy_hint") or "")
                                elif isinstance(err_val, str):
                                    error_message = err_val
                        except Exception:
                            pass

                        err_msg = error_message or resp.text

                        # 401 / 403: Permanent auth failure aborts immediately
                        if status_code in {401, 403}:
                            raise OpenRouterConfigurationError(
                                f"OpenRouter authentication failed (HTTP {status_code}): {err_msg}",
                                status_code=status_code,
                            )

                        # 402: Credits exhausted / Payment required aborts immediately
                        if status_code == 402:
                            raise OpenRouterConfigurationError(
                                f"OpenRouter credits exhausted or payment required (HTTP 402): {err_msg}",
                                status_code=402,
                            )

                        # 400: Permanent client error aborts immediately
                        if status_code == 400:
                            raise AIAnalysisGenerationError(
                                f"OpenRouter API error (HTTP 400): {err_msg}",
                                status_code=400,
                            )

                        # 404: Model not found: move immediately to next candidate
                        if status_code == 404:
                            logger.warning(
                                "Model '%s' not found on OpenRouter (HTTP 404). Trying next fallback.",
                                current_model,
                            )
                            attempt_log.append(f"{current_model}: HTTP 404 not found")
                            break

                        # 429: Rate limit or quota exhaustion
                        if status_code == 429:
                            last_limit_source = limit_source
                            last_provider_name = provider_name
                            last_remedy_hint = remedy_hint
                            last_raw_err = raw_msg

                            # 1. Upstream provider shared pool capacity saturation (model-specific)
                            is_upstream_pool = (
                                limit_source == "upstream_provider_shared_pool"
                                or "upstream_provider_shared_pool" in raw_msg.lower()
                                or "rate-limited upstream" in raw_msg.lower()
                                or "rate-limited upstream" in err_msg.lower()
                            )
                            if is_upstream_pool:
                                prov_label = provider_name or "upstream provider"
                                if not remedy_hint:
                                    remedy_hint = (
                                        f"Upstream provider ({prov_label}) shared pool is saturated. "
                                        f"Consider configuring a fallback model in OPENROUTER_FALLBACK_MODELS or retrying later."
                                    )
                                last_remedy_hint = remedy_hint
                                logger.warning(
                                    "Model '%s' is temporarily rate-limited by upstream shared pool (%s). "
                                    "Skipping same-model retries and advancing to next fallback candidate.",
                                    current_model,
                                    prov_label,
                                )
                                log_entry = f"{current_model}: HTTP 429 upstream pool saturated ({prov_label})"
                                if raw_msg:
                                    log_entry += f" - {raw_msg}"
                                attempt_log.append(log_entry)
                                break

                            # 2. Account-level daily limit or credit exhaustion
                            err_combined = f"{err_msg} {raw_msg}".lower()
                            is_account_quota = (
                                limit_source == "account_daily_limit"
                                or any(
                                    k in err_combined
                                    for k in (
                                        "quota",
                                        "credit",
                                        "daily",
                                        "exceeded",
                                        "balance",
                                        "free_tier",
                                    )
                                )
                            )
                            if is_account_quota:
                                if not remedy_hint:
                                    remedy_hint = "Account daily limit or credits exhausted. Check account balance or upgrade tier."
                                last_remedy_hint = remedy_hint
                                logger.warning(
                                    "Model '%s' account quota or credit exhausted (HTTP 429). Advancing to next fallback candidate.",
                                    current_model,
                                )
                                attempt_log.append(f"{current_model}: HTTP 429 account quota exhausted")
                                break

                            # 3. Genuine transient burst rate limit (client concurrency): backoff and retry
                            if attempt < self.max_retries:
                                retry_after_hdr = resp.headers.get("Retry-After")
                                retry_after_val: Optional[float] = None
                                if retry_after_hdr:
                                    try:
                                        retry_after_val = float(retry_after_hdr)
                                    except ValueError:
                                        pass

                                if retry_after_val is not None and 0.0 < retry_after_val <= 10.0:
                                    backoff = retry_after_val
                                else:
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

                            attempt_log.append(f"{current_model}: HTTP 429 burst limit exhausted")
                            break

                        # 500 / 502 / 503 / 504 / 408: Server errors are transient
                        if status_code in {408, 500, 502, 503, 504}:
                            if attempt < self.max_retries:
                                backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                                logger.warning(
                                    "OpenRouter server error (HTTP %d) on model '%s'. Retrying in %.2fs (attempt %d/%d)...",
                                    status_code,
                                    current_model,
                                    backoff,
                                    attempt + 1,
                                    self.max_retries,
                                )
                                time.sleep(backoff)
                                continue

                            attempt_log.append(f"{current_model}: HTTP {status_code} exhausted")
                            break

                        # Unexpected status code
                        raise AIAnalysisGenerationError(
                            f"Unexpected HTTP {status_code} from OpenRouter: {err_msg}",
                            status_code=status_code,
                        )

                    except httpx.TimeoutException as te:
                        last_exception = te
                        last_status_code = 504
                        if attempt < self.max_retries:
                            backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                            logger.warning(
                                "OpenRouter timeout on model '%s'. Retrying in %.2fs (attempt %d/%d)...",
                                current_model,
                                backoff,
                                attempt + 1,
                                self.max_retries,
                            )
                            time.sleep(backoff)
                            continue
                        attempt_log.append(f"{current_model}: timeout exhausted")
                        break

                    except httpx.NetworkError as ne:
                        last_exception = ne
                        last_status_code = 503
                        if attempt < self.max_retries:
                            backoff = min((1.5 ** attempt) * 2.0 + random.uniform(0.2, 0.8), 10.0)
                            logger.warning(
                                "OpenRouter network error on model '%s'. Retrying in %.2fs (attempt %d/%d)...",
                                current_model,
                                backoff,
                                attempt + 1,
                                self.max_retries,
                            )
                            time.sleep(backoff)
                            continue
                        attempt_log.append(f"{current_model}: network error exhausted")
                        break

                if model_succeeded:
                    break

        finally:
            if self.http_client is None:
                client_cm.close()

        if raw_response_content is None:
            if isinstance(last_exception, httpx.TimeoutException):
                raise OpenRouterTimeoutError(
                    f"OpenRouter timeout across models {candidates} (log: {'; '.join(attempt_log)}): {str(last_exception)}",
                    status_code=504,
                )
            if last_status_code == 429:
                err_summary = f"OpenRouter rate limit or quota reached (HTTP 429) across models {candidates}: {'; '.join(attempt_log)}"
                raise OpenRouterRateLimitError(
                    err_summary,
                    status_code=429,
                    limit_source=last_limit_source,
                    provider_name=last_provider_name,
                    remedy_hint=last_remedy_hint,
                )
            if last_status_code in {408, 500, 502, 503, 504}:
                raise OpenRouterServiceUnavailableError(
                    f"OpenRouter service unavailable (HTTP {last_status_code}) across models {candidates} (log: {'; '.join(attempt_log)})",
                    status_code=last_status_code,
                )
            raise AIAnalysisGenerationError(
                f"Failed to generate AI analysis across OpenRouter models {candidates} (log: {'; '.join(attempt_log)}): {str(last_exception)}"
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
            raise AIAnalysisGenerationError(
                f"AI reasoning response failed schema validation or contained malformed JSON: {str(e)}"
            ) from e
