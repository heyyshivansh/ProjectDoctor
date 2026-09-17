import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.artifact import ArtifactResponse


class ProjectBase(BaseModel):
    """Shared base fields for Project schemas."""

    title: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Project title",
        examples=["Autonomous Smart Grid Optimizer"],
    )
    problem_statement: str = Field(
        ...,
        min_length=10,
        description="Problem addressed by the project",
    )
    description: str = Field(
        ...,
        min_length=10,
        description="Detailed project overview",
    )
    requirements: Optional[str] = Field(
        default=None,
        description="Initial user-provided requirements (text or markdown)",
    )
    tech_stack: Optional[List[str]] = Field(
        default_factory=list,
        description="List of primary technologies utilized",
    )
    architecture_summary: Optional[str] = Field(
        default=None,
        description="High-level architecture description",
    )
    github_repo_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional repository URL",
    )

    @field_validator("title", "problem_statement", "description")
    @classmethod
    def strip_text(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
        return v

    @field_validator("github_repo_url")
    @classmethod
    def validate_github_url(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if v and not (v.startswith("http://") or v.startswith("https://")):
                raise ValueError("github_repo_url must start with http:// or https://")
            if not v:
                return None
        return v


class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""

    pass


class ProjectResponse(ProjectBase):
    """Schema for returning project data."""

    id: uuid.UUID
    status: str = Field(default="created")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListItem(BaseModel):
    """Summary item for project listing."""

    id: uuid.UUID
    title: str
    status: str
    artifact_count: int = Field(default=0)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    """Paginated list of projects."""

    items: List[ProjectListItem]
    total: int
    skip: int
    limit: int


class ProjectDetailResponse(ProjectResponse):
    """Detailed project response including attached artifacts."""

    artifacts: List[ArtifactResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
