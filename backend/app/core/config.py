import os
from typing import List, Optional, Set
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Application settings and configuration."""

    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    PROJECT_NAME: str = Field(default_factory=lambda: os.getenv("PROJECT_NAME", "Project Doctor"))
    API_PREFIX: str = Field(default_factory=lambda: os.getenv("API_PREFIX", "/api"))
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./project_doctor.db")
    )
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
    GEMINI_TIMEOUT_SECONDS: float = Field(
        default_factory=lambda: float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30.0"))
    )
    GEMINI_MAX_RETRIES: int = Field(
        default_factory=lambda: int(os.getenv("GEMINI_MAX_RETRIES", "2"))
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
