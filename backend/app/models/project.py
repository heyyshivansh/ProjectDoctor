import uuid
from datetime import datetime
from typing import List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Project(Base):
    """Technical project submitted for evaluation."""

    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
        index=True,
    )
    problem_statement: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        sa.Text,
        nullable=False,
    )
    requirements: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    tech_stack: Mapped[Optional[List[str]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    architecture_summary: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    github_repo_url: Mapped[Optional[str]] = mapped_column(
        sa.String(500),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="created",
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
    )

    # Relationships
    artifacts: Mapped[List["Artifact"]] = relationship(
        "Artifact",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
