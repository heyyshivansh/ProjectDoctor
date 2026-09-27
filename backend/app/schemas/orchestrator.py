import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AnalysisTriggerRequest(BaseModel):
    """Request payload to trigger project analysis."""

    force: bool = Field(
        default=False,
        description="Whether to bypass caches and force fresh sync and re-evaluation across all stages.",
    )


class AnalysisStageInfo(BaseModel):
    """Information and current status of an individual evaluation stage."""

    stage: str = Field(..., description="Internal stage identifier (e.g. STAGE_DOCUMENTS)")
    label: str = Field(..., description="Student-facing plain-language label")
    description: str = Field(..., description="Plain-language description of what this stage does")
    status: str = Field(
        ...,
        description="Status of this stage: pending | active | completed | failed | skipped",
    )
    detail: Optional[str] = Field(
        default=None,
        description="Optional truthful outcome summary (e.g. 'Verified 3 documents', 'Commit 5974939')",
    )


class AnalysisStatusResponse(BaseModel):
    """Truthful, comprehensive evaluation status for a project."""

    project_id: uuid.UUID
    project_title: str
    status: str = Field(
        ...,
        description="High-level evaluation state: not_started | running | completed | interrupted | failed | stale | insufficient_evidence",
    )
    current_stage: Optional[str] = Field(
        default=None,
        description="Active internal stage code if currently running",
    )
    current_stage_label: Optional[str] = Field(
        default=None,
        description="Student-facing label of the active stage",
    )
    stages: List[AnalysisStageInfo] = Field(
        default_factory=list,
        description="Sequential list of the 7 coarse evaluation stages and their statuses",
    )
    is_stale: bool = Field(
        default=False,
        description="Whether repository commits or documents have changed since last evaluation",
    )
    stale_reason: Optional[str] = Field(
        default=None,
        description="Explanation of why the evaluation is stale (e.g. new commits or document changes)",
    )
    critical_count: int = Field(default=0, description="Count of critical findings detected")
    needs_attention_count: int = Field(
        default=0, description="Count of findings needing attention (major + needs_attention)"
    )
    strengths_count: int = Field(
        default=0, description="Count of verified positive strengths confirmed by evidence"
    )
    analyzed_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp of the most recent evaluation",
    )
    commit_sha: Optional[str] = Field(
        default=None,
        description="Commit SHA evaluated in the active or most recent diagnosis",
    )
    message: Optional[str] = Field(
        default=None,
        description="Contextual user-facing message, especially for interrupted, failed, or insufficient states",
    )
    ai_status: Optional[str] = Field(
        default=None,
        description="Status of AI review synthesis: completed | unavailable | skipped",
    )
