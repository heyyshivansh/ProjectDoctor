from abc import ABC, abstractmethod
from typing import Optional
from app.schemas.ai_analysis import AIAnalysisResult
from app.schemas.ai_evidence import AIEvidencePackage


class AIProviderError(Exception):
    """Base exception for AI provider failures."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class AIProviderConfigurationError(AIProviderError):
    """Raised when an AI provider's configuration or credentials are missing or invalid."""

    pass


class GeminiConfigurationError(AIProviderConfigurationError):
    """Raised when the Gemini API key or environment configuration is missing or invalid."""

    pass


class GeminiRateLimitError(AIProviderError):
    """Raised when Gemini API rate limits (HTTP 429) are exhausted after retries."""

    pass


class GeminiTimeoutError(AIProviderError):
    """Raised when Gemini API call times out."""

    pass


class GeminiServiceUnavailableError(AIProviderError):
    """Raised when Gemini API is unavailable (HTTP 503 / 504) after retries."""

    pass


class OpenRouterConfigurationError(AIProviderConfigurationError):
    """Raised when OpenRouter API key or configuration is missing or invalid."""

    pass


class OpenRouterRateLimitError(AIProviderError):
    """Raised when OpenRouter rate limits (HTTP 429) or credits are exhausted."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = 429,
        limit_source: Optional[str] = None,
        provider_name: Optional[str] = None,
        remedy_hint: Optional[str] = None,
    ):
        super().__init__(message, status_code=status_code)
        self.limit_source = limit_source
        self.provider_name = provider_name
        self.remedy_hint = remedy_hint


class OpenRouterTimeoutError(AIProviderError):
    """Raised when OpenRouter API call times out."""

    pass


class OpenRouterServiceUnavailableError(AIProviderError):
    """Raised when OpenRouter service is unavailable (HTTP 502/503/504) after retries."""

    pass


class GroqConfigurationError(AIProviderConfigurationError):
    """Raised when Groq API key or configuration is missing or invalid."""

    pass


class GroqRateLimitError(AIProviderError):
    """Raised when Groq rate limits (HTTP 429) or quota are exhausted."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = 429,
        retry_after: Optional[float] = None,
    ):
        super().__init__(message, status_code=status_code)
        self.retry_after = retry_after


class GroqTimeoutError(AIProviderError):
    """Raised when Groq API call times out."""

    pass


class GroqServiceUnavailableError(AIProviderError):
    """Raised when Groq service is unavailable (HTTP 500/502/503/504) after retries."""

    pass


class AIAnalysisGenerationError(AIProviderError):
    """Raised when AI reasoning output cannot be generated or validated."""

    pass


class BaseAIProvider(ABC):
    """Abstract interface for AI reasoning engines."""

    provider_name: str = "base"
    model_name: str = "default"
    last_succeeded_model: Optional[str] = None

    @abstractmethod
    def analyze_project(
        self,
        evidence: AIEvidencePackage,
        prompt_version: str,
    ) -> AIAnalysisResult:
        """Execute structured project reasoning over the supplied evidence package."""
        pass
