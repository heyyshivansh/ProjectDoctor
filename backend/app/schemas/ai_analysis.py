import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

ObservationType = Literal["fact", "interpretation", "inference", "uncertainty"]
ObservationCategory = Literal[
    "architecture", "implementation", "verification", "specification", "security"
]
ConfidenceLevel = Literal["high", "medium", "low"]
CorrelationStatus = Literal[
    "supported", "partially_supported", "unsupported", "ambiguous"
]
SeverityAssessment = Literal["major", "moderate", "minor"]
TargetType = Literal[
    "requirement", "repository_file", "finding", "artifact", "traceability"
]
EvidenceGapArea = Literal[
    "scalability", "security", "testing", "deployment", "architecture"
]


class AIEvidenceCitation(BaseModel):
    """Verifiable link pointing to a canonical entity in the evidence package."""

    model_config = ConfigDict(from_attributes=True)

    target_type: TargetType = Field(description="Category of entity cited")
    target_id: Optional[uuid.UUID] = Field(
        default=None,
        description="Canonical persisted entity UUID whenever the cited entity has one",
    )
    identifier: str = Field(
        description="Canonical human-readable identifier (e.g. 'REQ-001', 'backend/app/main.py', finding_hash, 'proposal.pdf')"
    )
    detail: Optional[str] = Field(
        default=None,
        description="Brief supporting context, snippet summary, or rationale",
    )


class ProjectUnderstandingAssessment(BaseModel):
    """AI synthesis of what the project appears to be building based on evidence."""

    model_config = ConfigDict(from_attributes=True)

    summary: str = Field(
        description="Synthesized description of project purpose grounded in evidence"
    )
    primary_purpose: str = Field(description="Core problem being solved")
    target_users_identified: List[str] = Field(default_factory=list)
    key_capabilities_claimed: List[str] = Field(default_factory=list)
    evidence_basis: str = Field(
        default="Synthesized from project specifications and repository snapshot evidence.",
        description="Summary of documentation and repo evidence supporting this understanding",
    )
    confidence: ConfidenceLevel = Field(
        description="Confidence level based on completeness of available evidence"
    )


class AIObservation(BaseModel):
    """Evidence-backed project-level observation distinguishing fact from inference."""

    model_config = ConfigDict(from_attributes=True)

    observation_type: ObservationType
    category: ObservationCategory
    title: str = Field(description="Concise descriptive title")
    statement: str = Field(description="Detailed observation statement")
    technical_rationale: str = Field(
        description="Why this observation matters from an engineering/evaluation perspective"
    )
    evidence_citations: List[AIEvidenceCitation] = Field(default_factory=list)
    confidence: ConfidenceLevel


class AICrossArtifactCorrelation(BaseModel):
    """Comparison between documentation claims and repository implementation evidence."""

    model_config = ConfigDict(from_attributes=True)

    claim_source: str = Field(
        description="Specification claim reference, e.g. 'SRS / REQ-002'"
    )
    implementation_evidence: Optional[str] = Field(
        default=None,
        description="Repository evidence found, or 'none' if unsupported",
    )
    correlation_status: CorrelationStatus
    explanation: str = Field(
        description="Uncertainty-aware explanation of alignment between claim and code"
    )
    citations: List[AIEvidenceCitation] = Field(default_factory=list)


class AIContradiction(BaseModel):
    """Cross-source discrepancy or inconsistency identified between specs and code."""

    model_config = ConfigDict(from_attributes=True)

    headline: str = Field(description="Summary of the contradiction")
    specification_claim: str = Field(description="What the specification/document claims")
    repository_reality: str = Field(
        description="What was observed or not observed in repository evidence"
    )
    discrepancy_explanation: str = Field(
        description="Uncertainty-aware explanation (e.g. 'No supporting implementation evidence was found in the analyzed repository snapshot')"
    )
    severity_assessment: SeverityAssessment
    citations: List[AIEvidenceCitation] = Field(default_factory=list)


class AIEvidenceGap(BaseModel):
    """Domain where available evidence is insufficient to reach a confident conclusion."""

    model_config = ConfigDict(from_attributes=True)

    area: EvidenceGapArea
    missing_evidence_description: str = Field(
        description="What specific evidence is missing or cannot be evaluated from the snapshot"
    )
    why_needed: str = Field(description="Why an evaluator needs this evidence")
    recommended_evidence: str = Field(
        description="Concrete artifacts or repository evidence the team should provide"
    )


class AIDiagnosticInterpretation(BaseModel):
    """Contextual AI reasoning over a deterministic CP7 diagnostic finding."""

    model_config = ConfigDict(from_attributes=True)

    finding_id: Optional[uuid.UUID] = Field(
        default=None, description="UUID of the matching CP7 finding"
    )
    finding_title: str = Field(description="Title of the deterministic CP7 finding")
    project_context_impact: str = Field(
        description="AI explanation of what this finding means in the context of this specific project"
    )
    uncertainty_note: Optional[str] = Field(
        default=None,
        description="Any remaining uncertainty about the finding or its implications",
    )


class AIAnalysisResult(BaseModel):
    """Root structured AI reasoning response. NO chain-of-thought stored."""

    model_config = ConfigDict(from_attributes=True)

    analysis_summary: str = Field(
        description="Executive technical synthesis of project coherence, maturity, and readiness"
    )
    project_understanding: ProjectUnderstandingAssessment
    observations: List[AIObservation] = Field(default_factory=list)
    cross_artifact_correlations: List[AICrossArtifactCorrelation] = Field(
        default_factory=list
    )
    contradictions: List[AIContradiction] = Field(default_factory=list)
    evidence_gaps: List[AIEvidenceGap] = Field(default_factory=list)
    diagnostic_interpretations: List[AIDiagnosticInterpretation] = Field(
        default_factory=list
    )
    uncertainty_notes: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# API Response DTOs
# ---------------------------------------------------------------------------


class AIAnalysisResponse(BaseModel):
    """Read-only response model for AI project analysis."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[uuid.UUID] = None
    project_id: uuid.UUID
    snapshot_id: Optional[uuid.UUID] = None
    commit_sha: Optional[str] = None
    status: str = Field(
        ...,
        description="completed, not_analyzed, not_enough_evidence_yet, or failed",
    )
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    prompt_version: Optional[str] = None
    evidence_hash: Optional[str] = None
    analysis_summary: Optional[str] = None
    result: Optional[AIAnalysisResult] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AIAnalysisGenerationResponse(BaseModel):
    """Response returned when an AI analysis is generated or retrieved from cache."""

    model_config = ConfigDict(from_attributes=True)

    status: str
    message: str
    cached: bool = False
    analysis: AIAnalysisResponse


class AIAnalysisSummaryItem(BaseModel):
    """Lightweight history item for past analysis runs."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    snapshot_id: Optional[uuid.UUID] = None
    commit_sha: Optional[str] = None
    status: str
    model_name: str
    prompt_version: str
    created_at: datetime
