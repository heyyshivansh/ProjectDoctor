import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AIEvidenceRequirementItem(BaseModel):
    """Structured requirement evidence item for AI context."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    requirement_id: str = Field(description="Human-readable code e.g. REQ-001")
    title: str
    category: str
    is_ambiguous: bool = False
    conflict_summary: Optional[str] = None
    traceability_status: str = "unmatched"
    implementation_count: int = 0
    test_count: int = 0
    candidate_files: List[str] = Field(default_factory=list)


class AIEvidenceFileItem(BaseModel):
    """Indexed file in repository with UUID and path."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    file_path: str
    evidence_type: Optional[str] = None


class AIEvidenceTraceabilityItem(BaseModel):
    """Traceability mapping item."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    requirement_id: str
    status: str
    implementation_count: int
    test_count: int
    candidate_files: List[str] = Field(default_factory=list)


class AIEvidenceFindingItem(BaseModel):
    """Deterministic CP7 diagnostic finding item."""

    model_config = ConfigDict(from_attributes=True)

    finding_id: uuid.UUID
    finding_hash: str
    finding_type: str
    severity: str
    title: str
    summary: str
    why_it_matters: str
    suggested_action: Optional[str] = None
    evidence_references: List[Dict[str, Any]] = Field(default_factory=list)


class AIEvidenceArtifactItem(BaseModel):
    """Project documentation artifact item."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    artifact_type: str


class AIEvidencePackage(BaseModel):
    """Bounded, canonical structured evidence package provided to Gemini."""

    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    project_title: str
    snapshot_id: Optional[uuid.UUID] = None
    commit_sha: Optional[str] = None

    project_context: Dict[str, Any] = Field(
        description="Problem statement, description, declared tech stack, architecture summary"
    )
    document_understanding: Optional[Dict[str, Any]] = Field(
        default=None,
        description="11-dimension deterministic understanding summaries and artifacts",
    )
    artifacts: List[AIEvidenceArtifactItem] = Field(default_factory=list)
    requirements: List[AIEvidenceRequirementItem] = Field(default_factory=list)
    repository_summary: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Summary of repository tree, manifest files, entrypoints, and indexed files",
    )
    traceability_summary: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Status of requirements matched against repository snapshot",
    )
    diagnostic_findings: List[AIEvidenceFindingItem] = Field(
        default_factory=list,
        description="CP7 deterministic diagnostic findings",
    )
    evidence_counts: Dict[str, int] = Field(default_factory=dict)
