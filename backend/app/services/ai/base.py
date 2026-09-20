from abc import ABC, abstractmethod
from typing import Optional
from app.schemas.ai_analysis import AIAnalysisResult
from app.schemas.ai_evidence import AIEvidencePackage


class AIProviderError(Exception):
    """Base exception for AI provider failures."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class GeminiConfigurationError(AIProviderError):
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


class AIAnalysisGenerationError(AIProviderError):
    """Raised when AI reasoning output cannot be generated or validated."""

    pass


class BaseAIProvider(ABC):
    """Abstract interface for AI reasoning engines."""

    @abstractmethod
    def analyze_project(
        self,
        evidence: AIEvidencePackage,
        prompt_version: str,
    ) -> AIAnalysisResult:
        """Execute structured project reasoning over the supplied evidence package."""
        pass
