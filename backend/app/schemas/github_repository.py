import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RepositoryConnectRequest(BaseModel):
    """Payload to associate a GitHub repository with a project."""

    repo_url: str = Field(
        ...,
        description="Valid GitHub repository URL (e.g., https://github.com/owner/repo)",
        examples=["https://github.com/facebook/react"],
    )
    access_token: Optional[str] = Field(
        None,
        description="Optional Personal Access Token for private repos or elevated rate limits.",
    )


class RepositoryEvidenceResponse(BaseModel):
    """Structured verifiable evidence citation extracted from repository snapshot."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    snapshot_id: uuid.UUID
    project_id: uuid.UUID
    commit_sha: str
    file_path: str
    evidence_type: str
    language: Optional[str] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    content_snippet: Optional[str] = None
    evidence_hash: str
    extraction_method: str
    created_at: datetime


class RepositoryFileResponse(BaseModel):
    """Catalog entry for an individual file in the repository tree."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    snapshot_id: uuid.UUID
    file_path: str
    file_name: str
    file_extension: Optional[str] = None
    language: Optional[str] = None
    file_size_bytes: int
    blob_sha: str
    is_binary: bool
    is_ignored: bool
    content_status: str
    created_at: datetime


class RepositorySnapshotResponse(BaseModel):
    """Immutable commit snapshot representing repository state."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repository_id: uuid.UUID
    project_id: uuid.UUID
    commit_sha: str
    commit_message: Optional[str] = None
    commit_author: Optional[str] = None
    commit_date: Optional[datetime] = None
    branch: str
    total_files: int
    total_size_bytes: int
    structure_summary: Optional[Dict[str, Any]] = None
    is_current: bool
    status: str
    error_message: Optional[str] = None
    created_at: datetime


class RepositoryConnectionResponse(BaseModel):
    """Connection status and current snapshot overview for a project's repository."""

    id: uuid.UUID
    project_id: uuid.UUID
    repo_url: str
    owner: str
    repo_name: str
    default_branch: str
    is_private: bool
    has_token: bool
    status: str
    last_sync_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    current_snapshot: Optional[RepositorySnapshotResponse] = None


class RepositorySyncResponse(BaseModel):
    """Response returned after repository synchronization."""

    status: str
    message: str
    snapshot: RepositorySnapshotResponse
