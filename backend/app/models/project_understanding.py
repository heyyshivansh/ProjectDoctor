import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project


class ProjectUnderstanding(Base):
    """Deterministic structured representation of project understanding across 11 dimensions."""

    __tablename__ = "project_understandings"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="pending",
        index=True,
    )
    problem: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    target_users: Mapped[Optional[List[str]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    objectives: Mapped[Optional[List[str]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    requirements_summary: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    modules: Mapped[Optional[List[str]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    tech_stack: Mapped[Optional[List[str]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    architecture_overview: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    dependencies: Mapped[Optional[List[str]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    expected_scale: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    deployment: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    team: Mapped[Optional[List[dict]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    provenance: Mapped[Optional[dict]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=dict,
    )
    source_artifact_ids: Mapped[Optional[List[str]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    extracted_sections_count: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
        default=0,
    )
    total_words_analyzed: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
        default=0,
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
        back_populates="understanding",
    )
