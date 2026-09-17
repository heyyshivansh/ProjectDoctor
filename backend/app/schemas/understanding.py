import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectUnderstandingResponse(BaseModel):
    """Deterministic structured representation of project understanding across 11 dimensions."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    problem: Optional[str] = None
    target_users: List[str] = Field(default_factory=list)
    objectives: List[str] = Field(default_factory=list)
    requirements_summary: Optional[str] = None
    modules: List[str] = Field(default_factory=list)
    tech_stack: List[str] = Field(default_factory=list)
    architecture_overview: Optional[str] = None
    dependencies: List[str] = Field(default_factory=list)
    expected_scale: Optional[str] = None
    deployment: Optional[str] = None
    team: List[Dict[str, Any]] = Field(default_factory=list)
    provenance: Dict[str, Any] = Field(default_factory=dict)
    source_artifact_ids: List[str] = Field(default_factory=list)
    extracted_sections_count: int = 0
    total_words_analyzed: int = 0
    created_at: datetime
    updated_at: datetime
