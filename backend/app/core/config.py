from typing import List
from pydantic import BaseModel, Field


class Settings(BaseModel):
    """Application settings and configuration."""

    PROJECT_NAME: str = "Project Doctor"
    API_PREFIX: str = "/api"
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )


settings = Settings()
