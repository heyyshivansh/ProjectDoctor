import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.requirement import Requirement
    from app.models.github_repository import (
        RepositorySnapshot,
        RepositoryFile,
        RepositoryEvidence,
    )


class RequirementSnapshotTraceability(Base):
    """Aggregated traceability status for a requirement pinned to a repository snapshot/commit."""

    __tablename__ = "requirement_snapshot_traceabilities"

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
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("requirements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    commit_sha: Mapped[str] = mapped_column(
        sa.String(40),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="unmatched",
        index=True,
    )
    implementation_count: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
        default=0,
    )
    test_count: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
        default=0,
    )
    summary_notes: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
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
        sa.UniqueConstraint(
            "requirement_id", "snapshot_id", name="uq_req_snapshot_traceability"
        ),
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    requirement: Mapped["Requirement"] = relationship("Requirement")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot")
    links: Mapped[List["RequirementTraceabilityLink"]] = relationship(
        "RequirementTraceabilityLink",
        back_populates="traceability",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="desc(RequirementTraceabilityLink.match_confidence)",
    )


class RequirementTraceabilityLink(Base):
    """Specific candidate evidence link between a requirement and repository file/snippet."""

    __tablename__ = "requirement_traceability_links"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    traceability_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("requirement_snapshot_traceabilities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("requirements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    commit_sha: Mapped[str] = mapped_column(
        sa.String(40),
        nullable=False,
        index=True,
    )
    repository_file_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("repository_files.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    repository_evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("repository_evidence.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    file_path: Mapped[str] = mapped_column(
        sa.String(1000),
        nullable=False,
        index=True,
    )
    evidence_type: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="implementation_code",
        index=True,
    )
    is_test_evidence: Mapped[bool] = mapped_column(
        sa.Boolean,
        nullable=False,
        default=False,
        index=True,
    )
    match_confidence: Mapped[float] = mapped_column(
        sa.Float,
        nullable=False,
        default=0.0,
    )
    match_level: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="candidate_match",
    )
    match_rationale: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
    )
    line_start: Mapped[Optional[int]] = mapped_column(
        sa.Integer,
        nullable=True,
    )
    line_end: Mapped[Optional[int]] = mapped_column(
        sa.Integer,
        nullable=True,
    )
    code_snippet: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    link_hash: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )

    __table_args__ = (
        sa.UniqueConstraint(
            "snapshot_id", "link_hash", name="uq_snapshot_link_hash"
        ),
    )

    # Relationships
    traceability: Mapped["RequirementSnapshotTraceability"] = relationship(
        "RequirementSnapshotTraceability", back_populates="links"
    )
    requirement: Mapped["Requirement"] = relationship("Requirement")
    snapshot: Mapped["RepositorySnapshot"] = relationship("RepositorySnapshot")
    repository_file: Mapped[Optional["RepositoryFile"]] = relationship(
        "RepositoryFile"
    )
    repository_evidence: Mapped[Optional["RepositoryEvidence"]] = relationship(
        "RepositoryEvidence"
    )
