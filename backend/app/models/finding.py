import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.github_repository import RepositorySnapshot


class Finding(Base):
    """First-class domain model representing an evidence-backed diagnostic finding or strength."""

    __tablename__ = "findings"

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
    snapshot_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    commit_sha: Mapped[Optional[str]] = mapped_column(
        sa.String(40),
        nullable=True,
        index=True,
    )
    finding_type: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        index=True,
    )
    severity: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
    )
    summary: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
    )
    why_it_matters: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
    )
    suggested_action: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    evidence_references: Mapped[List[Dict[str, Any]]] = mapped_column(
        sa.JSON,
        nullable=False,
        default=list,
    )
    technical_details: Mapped[Dict[str, Any]] = mapped_column(
        sa.JSON,
        nullable=False,
        default=dict,
    )
    finding_hash: Mapped[str] = mapped_column(
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
        sa.UniqueConstraint(
            "project_id", "finding_hash", name="uq_project_finding_hash"
        ),
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="findings",
    )
    snapshot: Mapped[Optional["RepositorySnapshot"]] = relationship(
        "RepositorySnapshot",
    )
