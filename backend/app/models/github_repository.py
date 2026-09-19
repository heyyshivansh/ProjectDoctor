import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project


class GitHubRepository(Base):
    """Connected GitHub repository association for a project."""

    __tablename__ = "github_repositories"

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
    repo_url: Mapped[str] = mapped_column(
        sa.String(500),
        nullable=False,
    )
    owner: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False,
        index=True,
    )
    repo_name: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False,
        index=True,
    )
    default_branch: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False,
        default="main",
    )
    is_private: Mapped[bool] = mapped_column(
        sa.Boolean,
        nullable=False,
        default=False,
    )
    access_token: Mapped[Optional[str]] = mapped_column(
        sa.String(500),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="connected",
    )
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
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
        back_populates="repository",
    )
    snapshots: Mapped[List["RepositorySnapshot"]] = relationship(
        "RepositorySnapshot",
        back_populates="repository",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="desc(RepositorySnapshot.created_at)",
    )


class RepositorySnapshot(Base):
    """Immutable point-in-time commit snapshot of a GitHub repository."""

    __tablename__ = "repository_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("github_repositories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    commit_sha: Mapped[str] = mapped_column(
        sa.String(40),
        nullable=False,
        index=True,
    )
    commit_message: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    commit_author: Mapped[Optional[str]] = mapped_column(
        sa.String(255),
        nullable=True,
    )
    commit_date: Mapped[Optional[datetime]] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=True,
    )
    branch: Mapped[str] = mapped_column(
        sa.String(100),
        nullable=False,
    )
    total_files: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
        default=0,
    )
    total_size_bytes: Mapped[int] = mapped_column(
        sa.BigInteger,
        nullable=False,
        default=0,
    )
    structure_summary: Mapped[Optional[dict]] = mapped_column(
        sa.JSON,
        nullable=True,
        default=dict,
    )
    is_current: Mapped[bool] = mapped_column(
        sa.Boolean,
        nullable=False,
        default=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="completed",
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

    # Relationships
    repository: Mapped["GitHubRepository"] = relationship(
        "GitHubRepository",
        back_populates="snapshots",
    )
    project: Mapped["Project"] = relationship(
        "Project",
        back_populates="repository_snapshots",
    )
    files: Mapped[List["RepositoryFile"]] = relationship(
        "RepositoryFile",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    evidence: Mapped[List["RepositoryEvidence"]] = relationship(
        "RepositoryEvidence",
        back_populates="snapshot",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class RepositoryFile(Base):
    """File entry in a repository snapshot tree with classification and size."""

    __tablename__ = "repository_files"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_path: Mapped[str] = mapped_column(
        sa.String(1000),
        nullable=False,
        index=True,
    )
    file_name: Mapped[str] = mapped_column(
        sa.String(255),
        nullable=False,
    )
    file_extension: Mapped[Optional[str]] = mapped_column(
        sa.String(50),
        nullable=True,
    )
    language: Mapped[Optional[str]] = mapped_column(
        sa.String(50),
        nullable=True,
    )
    file_size_bytes: Mapped[int] = mapped_column(
        sa.Integer,
        nullable=False,
        default=0,
    )
    blob_sha: Mapped[str] = mapped_column(
        sa.String(40),
        nullable=False,
    )
    is_binary: Mapped[bool] = mapped_column(
        sa.Boolean,
        nullable=False,
        default=False,
    )
    is_ignored: Mapped[bool] = mapped_column(
        sa.Boolean,
        nullable=False,
        default=False,
    )
    content_status: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
        default="indexed_metadata_only",
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )

    __table_args__ = (
        sa.UniqueConstraint("snapshot_id", "file_path", name="uq_snapshot_file_path"),
    )

    # Relationships
    snapshot: Mapped["RepositorySnapshot"] = relationship(
        "RepositorySnapshot",
        back_populates="files",
    )


class RepositoryEvidence(Base):
    """Structured verifiable fact extracted from a repository snapshot."""

    __tablename__ = "repository_evidence"

    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    snapshot_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("repository_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid,
        sa.ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    commit_sha: Mapped[str] = mapped_column(
        sa.String(40),
        nullable=False,
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
        index=True,
    )
    language: Mapped[Optional[str]] = mapped_column(
        sa.String(50),
        nullable=True,
    )
    start_line: Mapped[Optional[int]] = mapped_column(
        sa.Integer,
        nullable=True,
    )
    end_line: Mapped[Optional[int]] = mapped_column(
        sa.Integer,
        nullable=True,
    )
    content_snippet: Mapped[Optional[str]] = mapped_column(
        sa.Text,
        nullable=True,
    )
    evidence_hash: Mapped[str] = mapped_column(
        sa.String(64),
        nullable=False,
        index=True,
    )
    extraction_method: Mapped[str] = mapped_column(
        sa.String(50),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )

    __table_args__ = (
        sa.UniqueConstraint("snapshot_id", "evidence_hash", name="uq_snapshot_evidence_hash"),
    )

    # Relationships
    snapshot: Mapped["RepositorySnapshot"] = relationship(
        "RepositorySnapshot",
        back_populates="evidence",
    )
