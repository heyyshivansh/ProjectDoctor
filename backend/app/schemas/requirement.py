import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RequirementEvidenceResponse(BaseModel):
    """Verifiable source evidence item supporting a requirement."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    requirement_id: uuid.UUID
    project_id: uuid.UUID
    artifact_id: Optional[uuid.UUID] = None
    source_type: str
    artifact_name: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    exact_snippet: str
    extraction_method: str
    confidence: float = 1.0
    created_at: datetime


class RequirementResponse(BaseModel):
    """Structured requirement entity."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    requirement_id: str
    title: str
    description: str
    category: str
    priority: Optional[str] = None
    actor: Optional[str] = None
    status: str
    is_ambiguous: bool = False
    conflict_summary: Optional[str] = None
    content_hash: str
    evidence_count: int = 0
    created_at: datetime
    updated_at: datetime


class RequirementDetailResponse(RequirementResponse):
    """Detailed requirement view including all supporting evidence items."""
    evidence: List[RequirementEvidenceResponse] = Field(default_factory=list)


class RequirementExtractionSummaryResponse(BaseModel):
    """Summary of requirement extraction execution outcome."""
    total_extracted: int
    functional_count: int
    non_functional_count: int
    security_count: int
    ambiguous_count: int
    conflicted_count: int
    requirements: List[RequirementResponse]


class RequirementMetricsResponse(BaseModel):
    """Aggregate metrics and distribution for project requirements."""
    total: int
    by_category: Dict[str, int]
    by_priority: Dict[str, int]
    by_status: Dict[str, int]
    ambiguous_count: int
    conflict_count: int
