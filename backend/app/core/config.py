import os
from pathlib import Path
from typing import List, Optional, Set
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Anchor paths to the backend directory regardless of CWD
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BACKEND_DIR / ".env"
load_dotenv(ENV_FILE)

DEFAULT_SQLITE_PATH = BACKEND_DIR / "project_doctor.db"


def _resolve_database_url() -> str:
    """Ensure SQLite database URL is deterministically anchored to the backend directory."""
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        return f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"

    # Anchor relative SQLite URLs to BACKEND_DIR
    if raw_url.startswith("sqlite:///./"):
        rel_path = raw_url[len("sqlite:///./") :]
        resolved_path = (BACKEND_DIR / rel_path).resolve()
        return f"sqlite:///{resolved_path.as_posix()}"
    elif raw_url.startswith("sqlite:///") and not raw_url.startswith("sqlite:////"):
        # Check if it is an absolute Windows drive path (e.g., sqlite:///C:/...)
        rest = raw_url[len("sqlite:///") :]
        if not (len(rest) >= 2 and rest[1] == ":"):
            resolved_path = (BACKEND_DIR / rest).resolve()
            return f"sqlite:///{resolved_path.as_posix()}"

    return raw_url


class Settings(BaseModel):
    """Application settings and configuration."""

    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    PROJECT_NAME: str = Field(default_factory=lambda: os.getenv("PROJECT_NAME", "Project Doctor"))
    API_PREFIX: str = Field(default_factory=lambda: os.getenv("API_PREFIX", "/api"))
    DATABASE_URL: str = Field(default_factory=_resolve_database_url)
    STORAGE_LOCAL_DIR: str = Field(
        default_factory=lambda: os.getenv("STORAGE_LOCAL_DIR", "storage/uploads")
    )
    STORAGE_PROCESSED_DIR: str = Field(
        default_factory=lambda: os.getenv("STORAGE_PROCESSED_DIR", "storage/processed")
    )
    MAX_UPLOAD_SIZE_MB: int = Field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_SIZE_MB", "25"))
    )
    GITHUB_TOKEN: Optional[str] = Field(
        default_factory=lambda: os.getenv("GITHUB_TOKEN", None)
    )
    GEMINI_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY", None)
    )
    GEMINI_MODEL: str = Field(
        default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    )
    GEMINI_FALLBACK_MODELS: List[str] = Field(
        default_factory=lambda: [
            m.strip()
            for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3.6-flash,gemini-3.5-flash-lite").split(",")
            if m.strip()
        ]
    )
    GEMINI_TIMEOUT_SECONDS: float = Field(
        default_factory=lambda: float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30.0"))
    )
    GEMINI_MAX_RETRIES: int = Field(
        default_factory=lambda: int(os.getenv("GEMINI_MAX_RETRIES", "2"))
    )

    AI_PROVIDER: str = Field(
        default_factory=lambda: os.getenv("AI_PROVIDER", "gemini").lower()
    )
    OPENROUTER_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("OPENROUTER_API_KEY", None)
    )
    OPENROUTER_MODEL: str = Field(
        default_factory=lambda: os.getenv("OPENROUTER_MODEL", "google/gemma-4-31b-it:free")
    )
    OPENROUTER_FALLBACK_MODELS: List[str] = Field(
        default_factory=lambda: [
            m.strip()
            for m in os.getenv("OPENROUTER_FALLBACK_MODELS", "").split(",")
            if m.strip()
        ]
    )
    OPENROUTER_TIMEOUT_SECONDS: float = Field(
        default_factory=lambda: float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "45.0"))
    )
    OPENROUTER_MAX_RETRIES: int = Field(
        default_factory=lambda: int(os.getenv("OPENROUTER_MAX_RETRIES", "2"))
    )

    GROQ_API_KEY: Optional[str] = Field(
        default_factory=lambda: os.getenv("GROQ_API_KEY", None)
    )
    GROQ_MODEL: str = Field(
        default_factory=lambda: os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    )
    GROQ_TIMEOUT_SECONDS: float = Field(
        default_factory=lambda: float(os.getenv("GROQ_TIMEOUT_SECONDS", "30.0"))
    )
    GROQ_MAX_RETRIES: int = Field(
        default_factory=lambda: int(os.getenv("GROQ_MAX_RETRIES", "2"))
    )
    GROQ_MAX_OUTPUT_TOKENS: int = Field(
        default_factory=lambda: int(os.getenv("GROQ_MAX_OUTPUT_TOKENS", "2500"))
    )
    AI_INPUT_MAX_TOKENS: int = Field(
        default_factory=lambda: int(os.getenv("AI_INPUT_MAX_TOKENS", "4500"))
    )

    ALLOWED_UPLOAD_EXTENSIONS: Set[str] = {
        ".pdf",
        ".md",
        ".txt",
        ".docx",
        ".png",
        ".jpg",
        ".jpeg",
        ".zip",
    }
    ALLOWED_FILE_TYPES: Set[str] = {
        "proposal",
        "architecture_diagram",
        "requirement_doc",
        "report",
        "presentation",
        "code_archive",
        "other",
    }
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )


settings = Settings()
