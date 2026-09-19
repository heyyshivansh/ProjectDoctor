import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FindingEvidenceReference(BaseModel):
    """Lightweight canonical reference pointing to existing domain entity by ID."""

    model_config = ConfigDict(from_attributes=True)

    target_type: str = Field(
        ...,
        description="Type of entity: requirement, traceability, repository_file, repository_evidence, artifact",
    )
    target_id: uuid.UUID = Field(
        ...,
        description="Canonical primary key UUID in target table",
    )
    role: Optional[str] = Field(
        default=None,
        description="Role in finding: specification, implementation_candidate, test_evidence, sensitive_file",
    )


class HydratedEvidenceItem(BaseModel):
    """Hydrated evidence representation loaded from canonical models on demand."""

    model_config = ConfigDict(from_attributes=True)

    target_type: str
    target_id: uuid.UUID
    role: Optional[str] = None
    title: Optional[str] = None
    file_path: Optional[str] = None
    snippet: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    evidence_type: Optional[str] = None
    match_confidence: Optional[float] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None


class FindingSummaryResponse(BaseModel):
    """Concise finding summary for primary student-facing list and diagnosis cards."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    snapshot_id: Optional[uuid.UUID] = None
    commit_sha: Optional[str] = None
    finding_type: str
    severity: str = Field(
        ...,
        description="Severity level: critical, major, needs_attention, improvement, strength",
    )
    title: str
    summary: str
    why_it_matters: str
    suggested_action: Optional[str] = None
    finding_hash: str
    created_at: datetime
    updated_at: datetime


class FindingDetailResponse(BaseModel):
    """Detailed finding view with on-demand hydrated canonical evidence and progressive disclosure details."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    snapshot_id: Optional[uuid.UUID] = None
    commit_sha: Optional[str] = None
    finding_type: str
    severity: str
    title: str
    summary: str
    why_it_matters: str
    suggested_action: Optional[str] = None
    evidence_references: List[FindingEvidenceReference] = Field(default_factory=list)
    hydrated_evidence: List[HydratedEvidenceItem] = Field(default_factory=list)
    technical_details: Dict[str, Any] = Field(default_factory=dict)
    finding_hash: str
    created_at: datetime
    updated_at: datetime


class ProjectDiagnosisResponse(BaseModel):
    """Aggregated project health and diagnostic evaluation."""

    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    project_title: str
    status: str = Field(
        ...,
        description="Qualitative status: looks_solid, needs_attention, significant_concern, not_enough_evidence_yet, not_analyzed",
    )
    status_label: str
    summary: str
    snapshot_id: Optional[uuid.UUID] = None
    commit_sha: Optional[str] = None
    analyzed_at: Optional[datetime] = None
    total_findings: int = 0
    critical_count: int = 0
    major_count: int = 0
    needs_attention_count: int = 0
    improvements_count: int = 0
    strengths_count: int = 0
    top_findings: List[FindingSummaryResponse] = Field(default_factory=list)
    strengths: List[FindingSummaryResponse] = Field(default_factory=list)


class DiagnosisGenerationResponse(BaseModel):
    """Response returned when diagnosis generation is triggered."""

    status: str
    message: str
    diagnosis: ProjectDiagnosisResponse
