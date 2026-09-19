import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.requirement import RequirementEvidenceResponse


class TraceabilityLinkResponse(BaseModel):
    """Specific candidate evidence link between a requirement and repository file/snippet."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    traceability_id: uuid.UUID
    requirement_id: uuid.UUID
    snapshot_id: uuid.UUID
    commit_sha: str
    file_path: str
    evidence_type: str
    is_test_evidence: bool
    match_confidence: float
    match_level: str
    match_rationale: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    code_snippet: Optional[str] = None
    github_url: Optional[str] = None
    created_at: datetime


class RequirementTraceabilitySummaryResponse(BaseModel):
    """Snapshot-scoped summary of requirement traceability for student view."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    requirement_id: uuid.UUID
    requirement_code: str
    title: str
    description: str
    category: str
    priority: Optional[str] = None
    actor: Optional[str] = None
    snapshot_id: uuid.UUID
    commit_sha: str
    status: str = Field(
        ...,
        description="Traceability status: unmatched, candidate, candidate_with_tests, ambiguous",
    )
    implementation_count: int
    test_count: int
    summary_notes: Optional[str] = None
    candidate_files: List[str] = Field(default_factory=list)
    test_files: List[str] = Field(default_factory=list)
    specification_evidence_count: int = 0
    created_at: datetime
    updated_at: datetime


class RequirementTraceabilityDetailResponse(BaseModel):
    """Full deep-dive traceability view including specification provenance, code links, and test links."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    requirement_id: uuid.UUID
    requirement_code: str
    title: str
    description: str
    category: str
    priority: Optional[str] = None
    actor: Optional[str] = None
    is_ambiguous_specification: bool = False
    conflict_summary: Optional[str] = None
    snapshot_id: Optional[uuid.UUID] = None
    commit_sha: Optional[str] = None
    status: str
    implementation_count: int = 0
    test_count: int = 0
    summary_notes: Optional[str] = None
    specification_evidence: List[RequirementEvidenceResponse] = Field(
        default_factory=list
    )
    implementation_links: List[TraceabilityLinkResponse] = Field(
        default_factory=list
    )
    test_links: List[TraceabilityLinkResponse] = Field(default_factory=list)
    verification_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TraceabilityMetricsResponse(BaseModel):
    """Overall project requirement traceability coverage and health distribution."""

    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    snapshot_id: Optional[uuid.UUID] = None
    commit_sha: Optional[str] = None
    has_repository: bool = False
    total_requirements: int = 0
    candidate_with_tests_count: int = 0
    candidate_count: int = 0
    unmatched_count: int = 0
    ambiguous_count: int = 0
    coverage_percentage: float = 0.0


class TraceabilityGenerationResponse(BaseModel):
    """Result of running deterministic traceability matching on a snapshot."""

    status: str
    message: str
    snapshot_id: uuid.UUID
    commit_sha: str
    total_requirements: int
    generated_links_count: int
    metrics: TraceabilityMetricsResponse
