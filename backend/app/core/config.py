import os
from typing import List, Set
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
    MAX_UPLOAD_SIZE_MB: int = Field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_SIZE_MB", "25"))
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
