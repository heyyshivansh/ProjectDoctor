import logging
from app.core.config import settings
from app.services.ai.base import BaseAIProvider, AIProviderConfigurationError

logger = logging.getLogger(__name__)


def get_configured_ai_provider() -> BaseAIProvider:
    """
    Instantiate the AI reasoning provider specified by settings.AI_PROVIDER.

    Strictly validates supported provider types ('openrouter', 'gemini', 'mock').
    Never silently falls back to Gemini on unknown configuration values.
    """
    raw_provider = settings.AI_PROVIDER
    provider = (raw_provider or "").lower().strip()

    if provider == "groq":
        from app.services.ai.groq_client import GroqProvider

        return GroqProvider()
    elif provider == "openrouter":
        from app.services.ai.openrouter_client import OpenRouterProvider

        return OpenRouterProvider()
    elif provider == "gemini":
        from app.services.ai.gemini_client import GeminiProvider

        return GeminiProvider()
    elif provider == "mock":
        from app.services.ai.mock_provider import MockAIProvider

        return MockAIProvider()
    else:
        raise AIProviderConfigurationError(
            f"Unsupported AI_PROVIDER '{raw_provider}'. "
            f"Supported providers are: 'groq', 'openrouter', 'gemini', 'mock'."
        )
