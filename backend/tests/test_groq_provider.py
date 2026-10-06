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
    GroqConfigurationError,
    GroqRateLimitError,
    GroqTimeoutError,
    GroqServiceUnavailableError,
    AIAnalysisGenerationError,
)
from app.services.ai.groq_client import GroqProvider
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


def test_groq_provider_init():
    provider = GroqProvider(api_key="test-key")
    assert provider.provider_name == "groq"
    assert provider.model_name == "openai/gpt-oss-120b"
    assert provider.timeout_seconds == 30.0
    assert provider.max_retries == 2
    assert provider.max_output_tokens == 2500
    assert provider.last_usage is None


def test_groq_missing_api_key_raises_config_error(minimal_evidence):
    p_none = GroqProvider(api_key=None)
    with pytest.raises(GroqConfigurationError):
        p_none.analyze_project(minimal_evidence)

    p_empty = GroqProvider(api_key="   ")
    with pytest.raises(GroqConfigurationError):
        p_empty.analyze_project(minimal_evidence)


def test_groq_request_payload_format(minimal_evidence):
    """Specifically verify that response_format = {'type': 'json_object'} and max_tokens=2500 are sent."""
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "gen-123",
        "model": "openai/gpt-oss-120b",
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

    provider = GroqProvider(
        api_key="test-secret-key",
        http_client=mock_http_client,
    )
    result = provider.analyze_project(minimal_evidence)

    assert isinstance(result, AIAnalysisResult)
    assert mock_http_client.post.call_count == 1

    call_args, call_kwargs = mock_http_client.post.call_args
    assert call_kwargs["json"]["response_format"] == {"type": "json_object"}
    assert call_kwargs["json"]["model"] == "openai/gpt-oss-120b"
    assert call_kwargs["json"]["max_tokens"] == 2500
    assert "Authorization" in call_kwargs["headers"]
    assert call_kwargs["headers"]["Authorization"] == "Bearer test-secret-key"


def test_groq_successful_json_response(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "model": "openai/gpt-oss-120b",
        "choices": [
            {
                "message": {
                    "content": valid_mock_result.model_dump_json(),
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 1200,
            "completion_tokens": 600,
            "total_tokens": 1800,
        },
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    result = provider.analyze_project(minimal_evidence)

    assert isinstance(result, AIAnalysisResult)
    assert result.analysis_summary is not None
    assert provider.last_succeeded_model == "openai/gpt-oss-120b"
    assert provider.last_usage == {
        "prompt_tokens": 1200,
        "completion_tokens": 600,
        "total_tokens": 1800,
    }


def test_groq_length_truncation_raises_generation_error(minimal_evidence):
    """
    Verify that when finish_reason is 'length', GroqProvider immediately raises
    AIAnalysisGenerationError, even if the response content contains valid JSON.
    Truncated responses must NEVER be returned or persisted.
    """
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "model": "openai/gpt-oss-120b",
        "choices": [
            {
                "message": {
                    "content": valid_mock_result.model_dump_json(),
                },
                "finish_reason": "length",
            }
        ],
        "usage": {
            "prompt_tokens": 2000,
            "completion_tokens": 2500,
            "total_tokens": 4500,
        },
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
        max_output_tokens=2500,
    )

    with pytest.raises(AIAnalysisGenerationError) as exc_info:
        provider.analyze_project(minimal_evidence)

    assert "finish_reason='length'" in str(exc_info.value)
    assert "2500" in str(exc_info.value)
    assert provider.last_usage == {
        "prompt_tokens": 2000,
        "completion_tokens": 2500,
        "total_tokens": 4500,
    }
    # Crucial check: verify bounded retries were NOT triggered on truncation (call_count == 1)
    assert mock_http_client.post.call_count == 1


def test_groq_markdown_fenced_json(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)
    fenced_content = f"```json\n{valid_mock_result.model_dump_json()}\n```"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": fenced_content}}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    result = provider.analyze_project(minimal_evidence)
    assert isinstance(result, AIAnalysisResult)


def test_groq_malformed_json_raises_generation_error(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "This is not JSON at all."}}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    with pytest.raises(AIAnalysisGenerationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "malformed JSON" in str(exc_info.value)
    # Proves no repeated retries on malformed JSON
    assert mock_http_client.post.call_count == 1


def test_groq_schema_invalid_json_raises_generation_error(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": json.dumps({"unrelated_key": "some_value"})}}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    with pytest.raises(AIAnalysisGenerationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "schema validation" in str(exc_info.value)
    assert mock_http_client.post.call_count == 1


def test_groq_401_auth_error_aborts_immediately(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.json.return_value = {"error": {"message": "Invalid API key provided."}}
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    with pytest.raises(GroqConfigurationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "401" in str(exc_info.value)
    assert mock_http_client.post.call_count == 1


def test_groq_404_model_not_found_aborts_immediately(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_resp.json.return_value = {"error": {"message": "Model 'openai/gpt-oss-120b' not found."}}
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    with pytest.raises(GroqConfigurationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "404" in str(exc_info.value)
    assert mock_http_client.post.call_count == 1


def test_groq_transient_429_retries_with_retry_after(minimal_evidence):
    """Transient concurrency burst 429 respects Retry-After header."""
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

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
        max_retries=2,
    )
    with patch("time.sleep") as mock_sleep:
        result = provider.analyze_project(minimal_evidence)

    assert isinstance(result, AIAnalysisResult)
    assert mock_http_client.post.call_count == 2
    mock_sleep.assert_called_once_with(1.5)


def test_groq_quota_429_skips_retry_and_raises(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.json.return_value = {"error": {"message": "Daily request quota exceeded."}}
    resp_429.text = json.dumps(resp_429.json.return_value)
    mock_http_client.post.return_value = resp_429

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
        max_retries=2,
    )
    with pytest.raises(GroqRateLimitError) as exc_info:
        provider.analyze_project(minimal_evidence)
    # Exactly 1 call on the model; no backoff loops on quota exhaustion
    assert mock_http_client.post.call_count == 1
    assert "quota" in str(exc_info.value).lower()


def test_groq_503_service_unavailable_retries_and_raises(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    resp_503 = MagicMock()
    resp_503.status_code = 503
    resp_503.json.return_value = {"error": {"message": "Groq service unavailable."}}
    resp_503.text = json.dumps(resp_503.json.return_value)
    mock_http_client.post.return_value = resp_503

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
        max_retries=2,
    )
    with patch("time.sleep", return_value=None):
        with pytest.raises(GroqServiceUnavailableError):
            provider.analyze_project(minimal_evidence)

    # 1 initial + 2 retries = 3 calls
    assert mock_http_client.post.call_count == 3


def test_groq_timeout_retries_and_raises(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_http_client.post.side_effect = httpx.TimeoutException("Read timed out")

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
        max_retries=1,
    )
    with patch("time.sleep", return_value=None):
        with pytest.raises(GroqTimeoutError):
            provider.analyze_project(minimal_evidence)

    assert mock_http_client.post.call_count == 2


def test_citation_validation_with_groq_result(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    valid_mock_result = MockAIProvider().analyze_project(minimal_evidence)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": valid_mock_result.model_dump_json()}}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    result = provider.analyze_project(minimal_evidence)
    # Must validate cleanly against minimal_evidence
    CitationValidator.validate_citation_integrity(result, minimal_evidence)


def test_provider_factory_validation_groq(monkeypatch):
    """Factory must validate supported providers including groq."""
    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "groq")
    p_groq = get_configured_ai_provider()
    assert p_groq.provider_name == "groq"
    assert p_groq.model_name == "openai/gpt-oss-120b"


def test_provider_factory_preserves_all_providers(monkeypatch):
    """Factory must instantiate groq, openrouter, gemini, mock, and reject unknowns."""
    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "groq")
    assert get_configured_ai_provider().provider_name == "groq"

    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "openrouter")
    assert get_configured_ai_provider().provider_name == "openrouter"

    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "gemini")
    assert get_configured_ai_provider().provider_name == "gemini"

    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "mock")
    assert get_configured_ai_provider().provider_name == "mock"

    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "banana")
    with pytest.raises(AIProviderConfigurationError) as exc_info:
        get_configured_ai_provider()
    assert "Unsupported AI_PROVIDER 'banana'" in str(exc_info.value)
    assert "'groq'" in str(exc_info.value)


def test_groq_no_api_key_in_logs_or_exceptions(minimal_evidence, caplog):
    """Verify that GROQ_API_KEY is never leaked in exception messages or logs."""
    secret_key = "gsk_abcdef0123456789supersecretvalue998877"
    mock_http_client = MagicMock(spec=httpx.Client)

    resp_401 = MagicMock()
    resp_401.status_code = 401
    resp_401.headers = {}
    resp_401.json.return_value = {"error": {"message": "Invalid API Key"}}
    resp_401.text = '{"error": {"message": "Invalid API Key"}}'
    mock_http_client.post.return_value = resp_401

    provider = GroqProvider(
        api_key=secret_key,
        http_client=mock_http_client,
    )

    with pytest.raises(GroqConfigurationError) as exc_info:
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

def test_groq_finish_reason_length_raises_error(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [
            {
                "message": {"content": "{\"partial\": \"json\""},
                "finish_reason": "length"
            }
        ]
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
        max_output_tokens=2500,
    )
    with pytest.raises(AIAnalysisGenerationError) as exc_info:
        provider.analyze_project(minimal_evidence)
        
    err_str = str(exc_info.value)
    assert "finish_reason='length'" in err_str
    assert "2500" in err_str
    assert mock_http_client.post.call_count == 1

def test_groq_schema_valid_traceability_category(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    
    valid_payload = {
        "analysis_summary": "Summary",
        "project_understanding": {
            "summary": "Purpose",
            "primary_purpose": "Primary",
            "target_users_identified": [],
            "key_capabilities_claimed": [],
            "evidence_basis": "Evidence",
            "confidence": "high"
        },
        "observations": [
            {
                "observation_type": "fact",
                "category": "traceability",
                "title": "Traceability Fact",
                "statement": "Statement",
                "technical_rationale": "Rationale",
                "evidence_citations": [],
                "confidence": "high"
            }
        ],
        "cross_artifact_correlations": [],
        "contradictions": [],
        "evidence_gaps": [],
        "diagnostic_interpretations": [],
        "uncertainty_notes": []
    }
    
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": json.dumps(valid_payload)}, "finish_reason": "stop"}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    
    # Should not raise any validation error
    result = provider.analyze_project(minimal_evidence)
    assert result.observations[0].category == "traceability"


def test_groq_schema_invalid_category_raises_generation_error(minimal_evidence):
    mock_http_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    
    invalid_payload = {
        "analysis_summary": "Summary",
        "project_understanding": {
            "summary": "Purpose",
            "primary_purpose": "Primary",
            "target_users_identified": [],
            "key_capabilities_claimed": [],
            "evidence_basis": "Evidence",
            "confidence": "high"
        },
        "observations": [
            {
                "observation_type": "fact",
                "category": "unsupported_cat",
                "title": "Invalid Fact",
                "statement": "Statement",
                "technical_rationale": "Rationale",
                "evidence_citations": [],
                "confidence": "high"
            }
        ],
        "cross_artifact_correlations": [],
        "contradictions": [],
        "evidence_gaps": [],
        "diagnostic_interpretations": [],
        "uncertainty_notes": []
    }
    
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": json.dumps(invalid_payload)}, "finish_reason": "stop"}]
    }
    mock_http_client.post.return_value = mock_resp

    provider = GroqProvider(
        api_key="test-key",
        http_client=mock_http_client,
    )
    
    with pytest.raises(AIAnalysisGenerationError) as exc_info:
        provider.analyze_project(minimal_evidence)
    assert "schema validation" in str(exc_info.value).lower()
