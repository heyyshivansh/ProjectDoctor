import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.artifact import Artifact


class DocumentExtraction(Base):
    """Text extraction and outline metadata for an artifact."""

    __tablename__ = "document_extractions"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    artifact_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="pending",
        index=True,
    )
    extractor_name: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False,
    )
    text_storage_path: Mapped[Optional[str]] = mapped_column(
        sa.String(500),
        nullable=True,
    )
    text_preview: Mapped[Optional[str]] = mapped_column(
        sa.String(500),
        nullable=True,
    )
    page_count: Mapped[Optional[int]] = mapped_column(
        sa.Integer,
        nullable=True,
    )
    word_count: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
        default=0,
    )
    character_count: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
        default=0,
    )
    sha256_hash: Mapped[Optional[str]] = mapped_column(
        sa.String(64),
        nullable=True,
    )
    sections: Mapped[Optional[List[dict]]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=list,
    )
    doc_metadata: Mapped[Optional[dict]] = mapped_column(
        "metadata",
        sa.JSON,
        nullable=True,
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
    artifact: Mapped["Artifact"] = relationship(
        "Artifact",
        back_populates="extraction",
    )
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="extractions",
    )
