import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.github_repository import RepositorySnapshot


class AnalysisRun(Base):
    """Durable record representing a complete deterministic analysis pipeline execution."""

    __tablename__ = "analysis_runs"

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
        sa.ForeignKey("repository_snapshots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    input_fingerprint: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False,
    )
    deterministic_status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="running",
    )
    ai_status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="running",
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project")
    snapshot: Mapped[Optional["RepositorySnapshot"]] = relationship("RepositorySnapshot")
