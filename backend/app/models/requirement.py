import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.artifact import Artifact


class Requirement(Base):
    """Atomic, canonical requirement statement for a project."""

    __tablename__ = "requirements"

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
    requirement_id: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
    )
    category: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="functional",
        index=True,
    )
    priority: Mapped[Optional[str]] = mapped_column(
        sa.String(50),
        nullable=True,
    )
    actor: Mapped[Optional[str]] = mapped_column(
        sa.String(100),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="extracted",
        index=True,
    )
    is_ambiguous: Mapped[bool] = mapped_column(
        sa.Boolean,
        nullable=False,
        default=False,
    )
    conflict_summary: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    content_hash: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False,
        index=True,
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
        sa.UniqueConstraint("project_id", "content_hash", name="uq_project_requirement_content_hash"),
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="extracted_requirements",
    )
    evidence: Mapped[List["RequirementEvidence"]] = relationship(
        "RequirementEvidence",
        back_populates="requirement",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class RequirementEvidence(Base):
    """M:N link providing verifiable provenance between a requirement and source artifacts/metadata."""

    __tablename__ = "requirement_evidence"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    requirement_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("requirements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    artifact_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
    )
    artifact_name: Mapped[Optional[str]] = mapped_column(
        sa.String(255),
        nullable=True,
    )
    page_number: Mapped[Optional[int]] = mapped_column(
        sa.Integer,
        nullable=True,
    )
    section_title: Mapped[Optional[str]] = mapped_column(
        sa.String(255),
        nullable=True,
    )
    exact_snippet: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
    )
    extraction_method: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
    )
    confidence: Mapped[float] = mapped_column(
        sa.Float,
        nullable=False,
        default=1.0,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )

    __table_args__ = (
        sa.UniqueConstraint("requirement_id", "source_type", "artifact_id", "exact_snippet", name="uq_req_evidence_unique_source"),
    )

    # Relationships
    requirement: Mapped["Requirement"] = relationship(
        "Requirement",
        back_populates="evidence",
    )
    artifact: Mapped[Optional["Artifact"]] = relationship(
        "Artifact",
    )
