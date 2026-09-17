import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.document_extraction import DocumentExtraction


class Artifact(Base):
    """Uploaded artifact / file belonging to a project."""

    __tablename__ = "artifacts"

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
    original_filename: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
    )
    stored_filename: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
        unique=True,
    )
    storage_path: Mapped[str] = mapped_column(
        sa.String(500),
        nullable=False,
    )
    file_type: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="other",
        index=True,
    )
    mime_type: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False,
    )
    file_size_bytes: Mapped[int] = mapped_column(
        sa.BigInteger,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="uploaded",
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )

    # Relationships
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="artifacts",
    )
    extraction: Mapped[Optional["DocumentExtraction"]] = relationship(
        "DocumentExtraction",
        back_populates="artifact",
        cascade="all, delete-orphan",
        uselist=False,
    )
