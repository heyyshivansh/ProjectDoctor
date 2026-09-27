import json
from unittest.mock import MagicMock, patch
import uuid
import httpx
import pytest

from app.schemas.ai_analysis import (
    AIAnalysisResult,
    AIObservation,
    ProjectUnderstandingAssessment,
    AIEvidenceCitation,
)
from app.schemas.ai_evidence import (
    AIEvidencePackage,
    AIEvidenceRequirementItem,
    AIEvidenceFileItem,
    AIEvidenceFindingItem,
)
from app.services.ai.base import (
    AIProviderConfigurationError,
    OpenRouterConfigurationError,
    OpenRouterRateLimitError,
    OpenRouterTimeoutError,
    OpenRouterServiceUnavailableError,
    AIAnalysisGenerationError,
)
from app.services.ai.openrouter_client import OpenRouterProvider
from app.services.ai.mock_provider import MockAIProvider
from app.services.ai.factory import get_configured_ai_provider
from app.services.analysis.citation_validator import (
    CitationValidator,
    CitationIntegrityError,
)


@pytest.fixture
def minimal_evidence():
    pid = uuid.uuid4()
    req_id = uuid.uuid4()
    file_id = uuid.uuid4()
    find_id = uuid.uuid4()
    return AIEvidencePackage(
        project_id=pid,
        project_title="Test Project",
        project_context={"title": "Test Project", "problem_statement": "Problem"},
        requirements=[
            AIEvidenceRequirementItem(
                id=req_id,
                requirement_id="REQ-001",
                title="Automated Evaluation",
                category="functional",
            )
        ],
        files=[
            AIEvidenceFileItem(
                id=file_id,
                file_path="backend/app/main.py",
            )
        ],
        diagnostic_findings=[
            AIEvidenceFindingItem(
                finding_id=find_id,
                finding_hash="hash-12345",
                finding_type="testing_gap",
                title="Missing Test Suite",
                severity="major",
                summary="No unit tests detected.",
                why_it_matters="Tests are essential.",
            )
        ],
    )


def test_openrouter_provider_init():
    provider = OpenRouterProvider(api_key="test-key")
    assert provider.provider_name == "openrouter"
    assert provider.model_name == "google/gemma-4-31b-it:free"
    assert provider.timeout_seconds == 45.0
    assert provider.max_retries == 2
    assert provider.fallback_models == []


def test_openrouter_missing_api_key_raises_config_error(minimal_evidence):
    p_none = OpenRouterProvider(api_key=None)
    with pytest.raises(OpenRouterConfigurationError):
        p_none.analyze_project(minimal_evidence)

    p_empty = OpenRouterProvider(api_key="   ")
    with pytest.raises(OpenRouterConfigurationError):
        p_empty.analyze_project(minimal_evidence)


def test_openrouter_request_payload_format(minimal_evidence):
    """Specifically verify that response_format = {'type': 'json_object'} is sent."""
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "gen-123",
        "model": "google/gemma-4-31b-it:free",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": valid_mock_result.model_dump_json(),
                }
            }
        ],
    }
    mock_http_client.post.return_value = mock_resp

    provider = OpenRouterProvider(
        api_key="test-secret-key",
        http_client=mock_http_client,
    )
    result = provider.analyze_project(minimal_evidence)

    assert isinstance(result, AIAnalysisResult)
    assert mock_http_client.post.call_count == 1

    call_args, call_kwargs = mock_http_client.post.call_args
    assert call_kwargs["json"]["response_format"] == {"type": "json_object"}
    assert call_kwargs["json"]["model"] == "google/gemma-4-31b-it:free"
    assert "Authorization" in call_kwargs["headers"]
    assert call_kwargs["headers"]["Authorization"] == "Bearer test-secret-key"


def test_openrouter_successful_json_response(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "model": "google/gemma-4-31b-it:free",
        "choices": [
            {
                "message": {
                    "content": valid_mock_result.model_dump_json(),
                }
            }
        ],
    }
    mock_http_client.post.return_value = mock_resp

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    result = provider.analyze_project(minimal_evidence)

    assert isinstance(result, AIAnalysisResult)
    assert result.analysis_summary is not None
    assert provider.last_succeeded_model == "google/gemma-4-31b-it:free"


def test_openrouter_markdown_fenced_json(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)
    fenced_content = f"```json\n{valid_mock_result.model_dump_json()}\n```"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": fenced_content}}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    result = provider.analyze_project(minimal_evidence)
    assert isinstance(result, AIAnalysisResult)


def test_openrouter_malformed_json_raises_generation_error(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "This is not JSON at all."}}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    with pytest.raises(AIAnalysisGenerationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "malformed JSON" in str(exc_info.value)
    # Proves no repeated retries on malformed JSON
    assert mock_http_client.post.call_count == 1


def test_openrouter_schema_invalid_json_raises_generation_error(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    # Valid JSON but missing required fields according to AIAnalysisResult
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": json.dumps({"unrelated_key": "some_value"})}}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    with pytest.raises(AIAnalysisGenerationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "schema validation" in str(exc_info.value)
    assert mock_http_client.post.call_count == 1


def test_openrouter_401_auth_error_aborts_immediately(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.json.return_value = {"error": {"message": "Invalid API key provided."}}
    mock_http_client.post.return_value = mock_resp

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    with pytest.raises(OpenRouterConfigurationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "401" in str(exc_info.value)
    assert mock_http_client.post.call_count == 1


def test_openrouter_402_credits_error_aborts_immediately(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 402
    mock_resp.json.return_value = {"error": {"message": "Insufficient credits."}}
    mock_http_client.post.return_value = mock_resp

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    with pytest.raises(OpenRouterConfigurationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "402" in str(exc_info.value)
    assert mock_http_client.post.call_count == 1


def test_openrouter_transient_429_retries_and_succeeds(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.json.return_value = {"error": {"message": "Concurrency burst rate limit. Please retry."}}

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = {
        "choices": [{"message": {"content": valid_mock_result.model_dump_json()}}]
    }

    mock_http_client.post.side_effect = [resp_429, resp_200]

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
        max_retries=2,
    )
    with patch("time.sleep", return_value=None):
        result = provider.analyze_project(minimal_evidence)

    assert isinstance(result, AIAnalysisResult)
    assert mock_http_client.post.call_count == 2


def test_openrouter_quota_429_skips_retry_and_raises_rate_limit_error(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.json.return_value = {"error": {"message": "Daily request quota exceeded."}}
    mock_http_client.post.return_value = resp_429

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
        fallback_models=[],
        max_retries=2,
    )
    with pytest.raises(OpenRouterRateLimitError):
        provider.analyze_project(minimal_evidence)
    # Exactly 1 call on the primary model; no backoff loops on quota exhaustion
    assert mock_http_client.post.call_count == 1


def test_openrouter_503_service_unavailable_retries_and_raises(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    resp_503 = MagicMock()
    resp_503.status_code = 503
    resp_503.json.return_value = {"error": {"message": "No upstream provider available."}}
    mock_http_client.post.return_value = resp_503

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
        fallback_models=[],
        max_retries=2,
    )
    with patch("time.sleep", return_value=None):
        with pytest.raises(OpenRouterServiceUnavailableError):
            provider.analyze_project(minimal_evidence)

    # 1 initial + 2 retries = 3 calls
    assert mock_http_client.post.call_count == 3


def test_openrouter_timeout_retries_and_raises(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_http_client.post.side_effect = httpx.TimeoutException("Read timed out")

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
        fallback_models=[],
        max_retries=1,
    )
    with patch("time.sleep", return_value=None):
        with pytest.raises(OpenRouterTimeoutError):
            provider.analyze_project(minimal_evidence)

    assert mock_http_client.post.call_count == 2


def test_citation_validation_with_openrouter_result(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": valid_mock_result.model_dump_json()}}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    result = provider.analyze_project(minimal_evidence)
    # Must validate cleanly against minimal_evidence
    CitationValidator.validate_citation_integrity(result, minimal_evidence)


def test_provider_factory_validation(monkeypatch):
    """Factory must validate supported providers and reject unknown values."""
    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "openrouter")
    p_openrouter = get_configured_ai_provider()
    assert p_openrouter.provider_name == "openrouter"

    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "gemini")
    p_gemini = get_configured_ai_provider()
    assert p_gemini.provider_name == "gemini"

    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "mock")
    p_mock = get_configured_ai_provider()
    assert p_mock.provider_name == "mock"

    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "banana")
    with pytest.raises(AIProviderConfigurationError) as exc_info:
        get_configured_ai_provider()
    assert "Unsupported AI_PROVIDER 'banana'" in str(exc_info.value)


def test_openrouter_429_upstream_shared_pool_skips_same_model_retry(minimal_evidence):
    """Upstream shared pool 429 must skip same-model backoff retries and fail fast when no fallback."""
    mock_http_client = MagicMock(spec=httpx.Client)
    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.headers = {}
    resp_429.json.return_value = {
        "error": {
            "message": "google/gemma-4-31b-it:free is temporarily rate-limited upstream. Please retry shortly.",
            "code": 429,
            "metadata": {
                "limit_source": "upstream_provider_shared_pool",
                "provider_name": "Google AI Studio",
                "raw": "google/gemma-4-31b-it:free is temporarily rate-limited upstream. Please retry shortly.",
            },
        }
    }
    resp_429.text = json.dumps(resp_429.json.return_value)
    mock_http_client.post.return_value = resp_429

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
        fallback_models=[],
        max_retries=2,
    )
    with pytest.raises(OpenRouterRateLimitError) as exc_info:
        provider.analyze_project(minimal_evidence)

    # Exactly 1 call: NO same-model backoff retries on saturated upstream shared pool
    assert mock_http_client.post.call_count == 1
    err = exc_info.value
    assert err.limit_source == "upstream_provider_shared_pool"
    assert err.provider_name == "Google AI Studio"
    assert err.remedy_hint is not None
    assert "Google AI Studio" in err.remedy_hint or "upstream" in err.remedy_hint.lower()


def test_openrouter_429_upstream_shared_pool_advances_to_explicit_fallback(minimal_evidence):
    """When primary model hits upstream shared pool 429, immediately advance to configured fallback."""
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.headers = {}
    resp_429.json.return_value = {
        "error": {
            "message": "google/gemma-4-31b-it:free is temporarily rate-limited upstream.",
            "code": 429,
            "metadata": {
                "limit_source": "upstream_provider_shared_pool",
                "provider_name": "Google AI Studio",
                "raw": "google/gemma-4-31b-it:free is temporarily rate-limited upstream.",
            },
        }
    }
    resp_429.text = json.dumps(resp_429.json.return_value)

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.headers = {}
    resp_200.json.return_value = {
        "model": "google/gemini-2.0-flash-exp:free",
        "choices": [{"message": {"content": valid_mock_result.model_dump_json()}}],
    }

    mock_http_client.post.side_effect = [resp_429, resp_200]

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
        model_name="google/gemma-4-31b-it:free",
        fallback_models=["google/gemini-2.0-flash-exp:free"],
        max_retries=2,
    )
    result = provider.analyze_project(minimal_evidence)

    assert isinstance(result, AIAnalysisResult)
    # 1 attempt on primary model (immediately broken), 1 attempt on fallback model
    assert mock_http_client.post.call_count == 2
    assert provider.last_succeeded_model == "google/gemini-2.0-flash-exp:free"


def test_openrouter_429_upstream_shared_pool_all_candidates_exhausted(minimal_evidence):
    """When all candidates hit upstream shared pool 429, exactly 1 call per candidate is made."""
    mock_http_client = MagicMock(spec=httpx.Client)

    def mock_post(*args, **kwargs):
        resp = MagicMock()
        resp.status_code = 429
        resp.headers = {}
        model = kwargs.get("json", {}).get("model", "unknown")
        resp.json.return_value = {
            "error": {
                "message": f"{model} is temporarily rate-limited upstream.",
                "code": 429,
                "metadata": {
                    "limit_source": "upstream_provider_shared_pool",
                    "provider_name": "Google AI Studio",
                    "raw": f"{model} rate-limited upstream",
                },
            }
        }
        resp.text = json.dumps(resp.json.return_value)
        return resp

    mock_http_client.post.side_effect = mock_post

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
        model_name="google/gemma-4-31b-it:free",
        fallback_models=["google/gemini-2.0-flash-exp:free"],
        max_retries=2,
    )
    with pytest.raises(OpenRouterRateLimitError) as exc_info:
        provider.analyze_project(minimal_evidence)

    # Exactly 2 calls: 1 for primary, 1 for fallback. Zero backoff retries.
    assert mock_http_client.post.call_count == 2
    assert exc_info.value.limit_source == "upstream_provider_shared_pool"
    assert exc_info.value.provider_name == "Google AI Studio"


def test_openrouter_transient_burst_retries_with_retry_after(minimal_evidence):
    """Transient client concurrency burst 429 respects Retry-After header."""
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.headers = {"Retry-After": "1.5"}
    resp_429.json.return_value = {
        "error": {
            "message": "Concurrency burst rate limit. Please retry.",
        }
    }
    resp_429.text = json.dumps(resp_429.json.return_value)

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.headers = {}
    resp_200.json.return_value = {
        "choices": [{"message": {"content": valid_mock_result.model_dump_json()}}]
    }

    mock_http_client.post.side_effect = [resp_429, resp_200]

    provider = OpenRouterProvider(
        api_key="test-key",
        http_client=mock_http_client,
        max_retries=2,
    )
    with patch("time.sleep") as mock_sleep:
        result = provider.analyze_project(minimal_evidence)

    assert isinstance(result, AIAnalysisResult)
    assert mock_http_client.post.call_count == 2
    mock_sleep.assert_called_once_with(1.5)


def test_openrouter_no_api_key_in_logs_or_exceptions(minimal_evidence, caplog):
    """Verify that OPENROUTER_API_KEY is never leaked in exception messages or logs."""
    secret_key = "sk-or-v1-abcdef0123456789supersecretvalue998877"
    mock_http_client = MagicMock(spec=httpx.Client)

    resp_401 = MagicMock()
    resp_401.status_code = 401
    resp_401.headers = {}
    resp_401.json.return_value = {"error": {"message": "Invalid API Key"}}
    resp_401.text = '{"error": {"message": "Invalid API Key"}}'
    mock_http_client.post.return_value = resp_401

    provider = OpenRouterProvider(
        api_key=secret_key,
        http_client=mock_http_client,
    )

    with pytest.raises(OpenRouterConfigurationError) as exc_info:
        provider.analyze_project(minimal_evidence)

    # Check exception message
    err_str = str(exc_info.value)
    assert secret_key not in err_str
    assert "abcdef0123456789" not in err_str
    assert "supersecretvalue" not in err_str

    # Check logs
    all_logs = caplog.text
    assert secret_key not in all_logs
    assert "abcdef0123456789" not in all_logs
    assert "supersecretvalue" not in all_logs
