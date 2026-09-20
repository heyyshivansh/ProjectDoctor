import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.github_repository import RepositorySnapshot


class AIAnalysis(Base):
    """Point-in-time evidence-grounded AI reasoning analysis for a project and snapshot."""

    __tablename__ = "ai_analyses"

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
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="completed",
        index=True,
    )
    model_provider: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="gemini",
    )
    model_name: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False,
    )
    prompt_version: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
    )
    evidence_hash: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False,
        index=True,
    )
    analysis_summary: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
    )
    structured_result: Mapped[Dict[str, Any]] = mapped_column(
        sa.JSON,
        nullable=False,
        default=dict,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
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

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="ai_analyses",
    )
    snapshot: Mapped[Optional["RepositorySnapshot"]] = relationship(
        "RepositorySnapshot",
    )
