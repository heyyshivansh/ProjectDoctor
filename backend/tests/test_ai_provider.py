from unittest.mock import MagicMock, patch
import pytest
from pydantic import ValidationError
from google.genai import errors as genai_errors

from app.schemas.ai_analysis import (
    AIAnalysisResult,
    AIEvidenceGap,
    AIObservation,
    ProjectUnderstandingAssessment,
)
from app.schemas.ai_evidence import AIEvidencePackage
from app.services.ai.base import (
    GeminiConfigurationError,
    GeminiRateLimitError,
    GeminiTimeoutError,
    AIAnalysisGenerationError,
)
from app.services.ai.gemini_client import GeminiProvider
from app.services.ai.mock_provider import MockAIProvider


@pytest.fixture
def minimal_evidence():
    import uuid
    return AIEvidencePackage(
        project_id=uuid.uuid4(),
        project_title="Test Project",
        project_context={"title": "Test Project", "problem_statement": "Problem"},
    )


def test_schema_literal_validation():
    # Valid observation
    obs = AIObservation(
        observation_type="fact",
        category="architecture",
        title="Title",
        statement="Statement",
        technical_rationale="Rationale",
        confidence="high",
    )
    assert obs.observation_type == "fact"

    # Invalid observation_type should raise ValidationError
    with pytest.raises(ValidationError):
        AIObservation(
            observation_type="speculation",  # Invalid
            category="architecture",
            title="Title",
            statement="Statement",
            technical_rationale="Rationale",
            confidence="high",
        )

    # Invalid confidence should raise ValidationError
    with pytest.raises(ValidationError):
        AIObservation(
            observation_type="fact",
            category="architecture",
            title="Title",
            statement="Statement",
            technical_rationale="Rationale",
            confidence="certain",  # Invalid
        )


def test_evidence_gap_area_all_nine_valid():
    valid_areas = [
        "architecture",
        "frontend",
        "backend",
        "implementation",
        "security",
        "testing",
        "deployment",
        "documentation",
        "scalability",
    ]
    for area in valid_areas:
        gap = AIEvidenceGap(
            area=area,
            missing_evidence_description="Description",
            why_needed="Reason",
            recommended_evidence="Provide evidence",
        )
        assert gap.area == area


def test_evidence_gap_area_invalid_rejected():
    invalid_areas = [
        "speculation",
        "random_area",
        "ui_ux",
        "database",
        "cloud",
        "",
    ]
    for invalid in invalid_areas:
        with pytest.raises(ValidationError):
            AIEvidenceGap(
                area=invalid,
                missing_evidence_description="Description",
                why_needed="Reason",
                recommended_evidence="Provide evidence",
            )


def test_evidence_gap_area_historical_five_valid():
    historical_areas = [
        "scalability",
        "security",
        "testing",
        "deployment",
        "architecture",
    ]
    for area in historical_areas:
        gap = AIEvidenceGap(
            area=area,
            missing_evidence_description="Description",
            why_needed="Reason",
            recommended_evidence="Provide evidence",
        )
        assert gap.area == area


def test_frontend_ai_analysis_result_validates():
    result_data = {
        "analysis_summary": "Evaluated project with missing frontend evidence.",
        "project_understanding": {
            "summary": "Full-stack legal platform",
            "primary_purpose": "Document verification",
            "target_users_identified": ["lawyers"],
            "key_capabilities_claimed": ["notarization"],
            "evidence_basis": "Specifications",
            "confidence": "medium",
        },
        "observations": [],
        "cross_artifact_correlations": [],
        "contradictions": [],
        "evidence_gaps": [
            {
                "area": "frontend",
                "missing_evidence_description": "No React client source code or UI build manifests were found in repository evidence.",
                "why_needed": "Cannot verify user interface implementation claims without frontend source code.",
                "recommended_evidence": "Submit frontend repository or React source files.",
            }
        ],
        "diagnostic_interpretations": [],
        "uncertainty_notes": ["Frontend implementation could not be verified."],
    }
    result = AIAnalysisResult.model_validate(result_data)
    assert len(result.evidence_gaps) == 1
    assert result.evidence_gaps[0].area == "frontend"


def test_mock_provider_success(minimal_evidence):
    provider = MockAIProvider()
    res = provider.analyze_project(minimal_evidence)
    assert isinstance(res, AIAnalysisResult)
    assert len(res.observations) > 0
    assert provider.call_count == 1


def test_mock_provider_simulated_errors(minimal_evidence):
    # Timeout
    p_timeout = MockAIProvider(should_timeout=True)
    with pytest.raises(GeminiTimeoutError):
        p_timeout.analyze_project(minimal_evidence)

    # Rate limit
    p_rate_limit = MockAIProvider(should_rate_limit=True)
    with pytest.raises(GeminiRateLimitError):
        p_rate_limit.analyze_project(minimal_evidence)

    # Schema error
    p_schema = MockAIProvider(should_fail_schema=True)
    with pytest.raises(AIAnalysisGenerationError):
        p_schema.analyze_project(minimal_evidence)


def test_gemini_provider_missing_key_raises_config_error(minimal_evidence):
    provider = GeminiProvider(api_key=None)
    with pytest.raises(GeminiConfigurationError):
        provider.analyze_project(minimal_evidence)

    provider_empty = GeminiProvider(api_key="   ")
    with pytest.raises(GeminiConfigurationError):
        provider_empty.analyze_project(minimal_evidence)


def test_gemini_provider_retry_transient_rate_limit(minimal_evidence):
    provider = GeminiProvider(api_key="test-key", fallback_models=[], max_retries=2, timeout_seconds=1.0)

    # Mock genai.Client
    mock_client = MagicMock()
    
    # First attempt: transient 429 concurrency burst error, Second attempt: successful response
    error_429 = genai_errors.APIError(429, {"message": "Concurrency rate limit exceeded: please slow down"})
    
    # Valid mock response text
    valid_res = MockAIProvider().analyze_project(minimal_evidence)
    success_resp = MagicMock()
    success_resp.text = valid_res.model_dump_json()

    mock_client.models.generate_content.side_effect = [error_429, success_resp]

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client), \
         patch("time.sleep", return_value=None):
        result = provider.analyze_project(minimal_evidence)
        assert isinstance(result, AIAnalysisResult)
        assert mock_client.models.generate_content.call_count == 2


def test_gemini_provider_quota_exhaustion_does_not_retry_same_model_and_falls_back(minimal_evidence):
    """HTTP 429 caused by daily/request quota exhaustion must NOT retry the same model, but immediately advance to fallback."""
    provider = GeminiProvider(
        api_key="test-key",
        model_name="gemini-3.8-flash",
        fallback_models=["gemini-3.6-flash"],
        max_retries=2,
        timeout_seconds=1.0,
    )
    mock_client = MagicMock()
    quota_error = genai_errors.APIError(
        429,
        {
            "message": "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash",
            "status": "RESOURCE_EXHAUSTED",
        },
    )
    valid_res = MockAIProvider().analyze_project(minimal_evidence)
    success_resp = MagicMock()
    success_resp.text = valid_res.model_dump_json()

    # Model 1 fails once with 429 quota exhaustion; must NOT be retried.
    # Model 2 succeeds immediately.
    mock_client.models.generate_content.side_effect = [quota_error, success_resp]

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client), \
         patch("time.sleep", return_value=None):
        result = provider.analyze_project(minimal_evidence)
        assert isinstance(result, AIAnalysisResult)
        # Total calls must be exactly 2: 1 for primary model (no retries!) + 1 for fallback model
        assert mock_client.models.generate_content.call_count == 2
        assert provider.last_succeeded_model == "gemini-3.6-flash"


def test_gemini_provider_quota_exhaustion_across_all_candidates_raises_rate_limit_error(minimal_evidence):
    """When all candidate models report quota exhaustion, it fails truthfully with GeminiRateLimitError without looping."""
    provider = GeminiProvider(
        api_key="test-key",
        model_name="gemini-3.8-flash",
        fallback_models=["gemini-3.6-flash"],
        max_retries=2,
        timeout_seconds=1.0,
    )
    mock_client = MagicMock()
    quota_error_1 = genai_errors.APIError(429, {"message": "Quota exceeded for gemini-3.8-flash"})
    quota_error_2 = genai_errors.APIError(429, {"message": "Quota exceeded for gemini-3.6-flash"})
    mock_client.models.generate_content.side_effect = [quota_error_1, quota_error_2]

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client), \
         patch("time.sleep", return_value=None):
        with pytest.raises(GeminiRateLimitError) as exc_info:
            provider.analyze_project(minimal_evidence)
        # Exactly 1 attempt per candidate model (2 calls total, no repeated retries on same model!)
        assert mock_client.models.generate_content.call_count == 2
        assert "429" in str(exc_info.value)


def test_gemini_provider_persistent_rate_limit_exhaustion(minimal_evidence):
    provider = GeminiProvider(api_key="test-key", fallback_models=[], max_retries=1, timeout_seconds=1.0)
    mock_client = MagicMock()
    error_429 = genai_errors.APIError(429, {"message": "Rate limit: please slow down"})
    mock_client.models.generate_content.side_effect = [error_429, error_429]

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client), \
         patch("time.sleep", return_value=None):
        with pytest.raises(GeminiRateLimitError):
            provider.analyze_project(minimal_evidence)
        assert mock_client.models.generate_content.call_count == 2


def test_gemini_provider_non_transient_error_aborts_immediately(minimal_evidence):
    provider = GeminiProvider(api_key="test-key", max_retries=2, timeout_seconds=1.0)
    mock_client = MagicMock()
    error_400 = genai_errors.APIError(400, {"message": "Bad Request"})
    mock_client.models.generate_content.side_effect = error_400

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client):
        with pytest.raises(AIAnalysisGenerationError) as exc_info:
            provider.analyze_project(minimal_evidence)
        assert mock_client.models.generate_content.call_count == 1
        assert "400" in str(exc_info.value)


def test_gemini_provider_malformed_json_not_retried(minimal_evidence):
    """Explicitly verify that malformed JSON returned by Gemini is NOT retried."""
    provider = GeminiProvider(api_key="test-key", max_retries=2, timeout_seconds=1.0)
    mock_client = MagicMock()
    malformed_resp = MagicMock()
    malformed_resp.text = "{ this is completely malformed json! <<>> "
    mock_client.models.generate_content.return_value = malformed_resp

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client):
        with pytest.raises(AIAnalysisGenerationError) as exc_info:
            provider.analyze_project(minimal_evidence)
        # MUST be called exactly once: malformed JSON must NOT trigger retries
        assert mock_client.models.generate_content.call_count == 1
        assert "malformed" in str(exc_info.value).lower() or "json" in str(exc_info.value).lower()


def test_gemini_provider_invalid_schema_not_retried(minimal_evidence):
    """Explicitly verify that invalid schema output from Gemini is NOT retried."""
    provider = GeminiProvider(api_key="test-key", max_retries=2, timeout_seconds=1.0)
    mock_client = MagicMock()
    invalid_schema_resp = MagicMock()
    invalid_schema_resp.text = '{"unexpected_random_key": "not conforming to AIAnalysisResult"}'
    mock_client.models.generate_content.return_value = invalid_schema_resp

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client):
        with pytest.raises(AIAnalysisGenerationError) as exc_info:
            provider.analyze_project(minimal_evidence)
        # MUST be called exactly once: schema validation failure must NOT trigger retries
        assert mock_client.models.generate_content.call_count == 1
        assert "validation" in str(exc_info.value).lower() or "schema" in str(exc_info.value).lower()


def test_gemini_provider_retry_transient_503(minimal_evidence):
    """Verify that HTTP 503 is treated as transient and retried."""
    provider = GeminiProvider(api_key="test-key", fallback_models=[], max_retries=2, timeout_seconds=1.0)
    mock_client = MagicMock()
    error_503 = genai_errors.APIError(503, {"message": "Service Unavailable"})
    
    valid_res = MockAIProvider().analyze_project(minimal_evidence)
    success_resp = MagicMock()
    success_resp.text = valid_res.model_dump_json()

    mock_client.models.generate_content.side_effect = [error_503, success_resp]

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client), \
         patch("time.sleep", return_value=None):
        result = provider.analyze_project(minimal_evidence)
        assert isinstance(result, AIAnalysisResult)
        assert mock_client.models.generate_content.call_count == 2
        assert provider.last_succeeded_model == provider.model_name


def test_gemini_provider_fallback_to_secondary_model_on_503(minimal_evidence):
    """Verify that when the primary model exhausts retries with 503, it falls back to the secondary model."""
    provider = GeminiProvider(
        api_key="test-key",
        model_name="gemini-3.8-flash",
        fallback_models=["gemini-3.6-flash"],
        max_retries=1,
        timeout_seconds=1.0,
    )
    mock_client = MagicMock()
    error_503 = genai_errors.APIError(503, {"message": "Service Unavailable"})

    valid_res = MockAIProvider().analyze_project(minimal_evidence)
    success_resp = MagicMock()
    success_resp.text = valid_res.model_dump_json()

    # 2 attempts on primary (503), then 1 attempt on fallback (success)
    mock_client.models.generate_content.side_effect = [error_503, error_503, success_resp]

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client), \
         patch("time.sleep", return_value=None):
        result = provider.analyze_project(minimal_evidence)
        assert isinstance(result, AIAnalysisResult)
        assert mock_client.models.generate_content.call_count == 3
        assert provider.last_succeeded_model == "gemini-3.6-flash"


def test_gemini_provider_fallback_on_404_not_found(minimal_evidence):
    """Verify that a 404 model error immediately advances to the fallback model."""
    provider = GeminiProvider(
        api_key="test-key",
        model_name="gemini-nonexistent",
        fallback_models=["gemini-3.6-flash"],
        max_retries=2,
        timeout_seconds=1.0,
    )
    mock_client = MagicMock()
    error_404 = genai_errors.APIError(404, {"message": "models/gemini-nonexistent is not found"})

    valid_res = MockAIProvider().analyze_project(minimal_evidence)
    success_resp = MagicMock()
    success_resp.text = valid_res.model_dump_json()

    mock_client.models.generate_content.side_effect = [error_404, success_resp]

    with patch("app.services.ai.gemini_client.genai.Client", return_value=mock_client), \
         patch("time.sleep", return_value=None):
        result = provider.analyze_project(minimal_evidence)
        assert isinstance(result, AIAnalysisResult)
        assert mock_client.models.generate_content.call_count == 2
        assert provider.last_succeeded_model == "gemini-3.6-flash"
