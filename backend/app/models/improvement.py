import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.ai_analysis import AIAnalysis
    from app.models.analysis_run import AnalysisRun
    from app.models.finding import Finding


class ImprovementItem(Base):
    """An actionable task tied to a specific finding, preserving student progress across runs."""

    __tablename__ = "improvement_items"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Original genesis (AI analysis kept for legacy/backwards compat if needed, but run_id preferred)
    analysis_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("ai_analyses.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    original_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("analysis_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    finding_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("findings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    # Stable identity for deterministic matching across runs
    stable_identity: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
        index=True,
    )
    
    # Verification tracking
    latest_verification_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("analysis_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    latest_matching_finding_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("findings.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Progress and Status
    status: Mapped[str] = mapped_column(
        sa.String(20),
        nullable=False,
        default="not_started",
        index=True,
    )
    verification_status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="unverified",
        index=True,
    )
    verification_detail: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False, default="Unknown")
    severity: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="minor")
    summary: Mapped[str] = mapped_column(sa.Text, nullable=False, default="")
    why_it_matters: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    suggested_action: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
    )

    __table_args__ = (
        # Ensure only one active/tracked item per stable identity per project
        sa.UniqueConstraint(
            "project_id", "stable_identity", name="uq_project_stable_identity"
        ),
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    analysis: Mapped[Optional["AIAnalysis"]] = relationship("AIAnalysis")
    original_run: Mapped[Optional["AnalysisRun"]] = relationship("AnalysisRun", foreign_keys=[original_run_id])
    finding: Mapped[Optional["Finding"]] = relationship("Finding", foreign_keys=[finding_id])
    latest_verification_run: Mapped[Optional["AnalysisRun"]] = relationship("AnalysisRun", foreign_keys=[latest_verification_run_id])
    latest_matching_finding: Mapped[Optional["Finding"]] = relationship("Finding", foreign_keys=[latest_matching_finding_id])
