from unittest.mock import MagicMock, patch
import pytest
from pydantic import ValidationError
from google.genai import errors as genai_errors

from app.schemas.ai_analysis import (
    AIAnalysisResult,
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
    provider = GeminiProvider(api_key="test-key", max_retries=2, timeout_seconds=1.0)

    # Mock genai.Client
    mock_client = MagicMock()
    
    # First attempt: 429 error, Second attempt: successful response
    error_429 = genai_errors.APIError(429, {"message": "Resource exhausted"})
    
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


def test_gemini_provider_persistent_rate_limit_exhaustion(minimal_evidence):
    provider = GeminiProvider(api_key="test-key", max_retries=1, timeout_seconds=1.0)
    mock_client = MagicMock()
    error_429 = genai_errors.APIError(429, {"message": "Rate limit"})
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
    provider = GeminiProvider(api_key="test-key", max_retries=2, timeout_seconds=1.0)
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
