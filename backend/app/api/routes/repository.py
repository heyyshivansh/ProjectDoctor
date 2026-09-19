import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
import sqlalchemy as sa

from app.db.session import get_db
from app.models.github_repository import GitHubRepository, RepositorySnapshot
from app.services.project_service import ProjectService
from app.services.github.service import GitHubRepositoryService
from app.services.github.client import (
    GitHubNotFoundError,
    GitHubAuthenticationError,
    GitHubRateLimitError,
    GitHubRepositoryOversizedError,
    GitHubAPIError,
)
from app.schemas.github_repository import (
    RepositoryConnectRequest,
    RepositoryConnectionResponse,
    RepositorySnapshotResponse,
    RepositoryFileResponse,
    RepositoryEvidenceResponse,
    RepositorySyncResponse,
)

router = APIRouter(prefix="/projects/{project_id}/repository", tags=["repository"])


def _verify_project_exists(db: Session, project_id: uuid.UUID):
    """Verify that the project exists, else raise 404."""
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )
    return project


def _build_connection_response(db: Session, repo: GitHubRepository) -> RepositoryConnectionResponse:
    """Helper to construct RepositoryConnectionResponse with active snapshot."""
    stmt = sa.select(RepositorySnapshot).where(
        RepositorySnapshot.repository_id == repo.id,
        RepositorySnapshot.is_current == True,
    )
    current_snapshot = db.scalars(stmt).first()

    snapshot_resp = (
        RepositorySnapshotResponse.model_validate(current_snapshot)
        if current_snapshot
        else None
    )

    return RepositoryConnectionResponse(
        id=repo.id,
        project_id=repo.project_id,
        repo_url=repo.repo_url,
        owner=repo.owner,
        repo_name=repo.repo_name,
        default_branch=repo.default_branch,
        is_private=repo.is_private,
        has_token=bool(repo.access_token),
        status=repo.status,
        last_sync_at=repo.last_sync_at,
        error_message=repo.error_message,
        created_at=repo.created_at,
        updated_at=repo.updated_at,
        current_snapshot=snapshot_resp,
    )


@router.post(
    "",
    response_model=RepositoryConnectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Connect or update a GitHub repository for a project",
)
def connect_repository(
    project_id: uuid.UUID,
    payload: RepositoryConnectRequest,
    db: Session = Depends(get_db),
) -> RepositoryConnectionResponse:
    """Validate and associate a GitHub repository with a project."""
    _verify_project_exists(db, project_id)

    try:
        repo = GitHubRepositoryService.connect_repository(
            db=db,
            project_id=project_id,
            repo_url=payload.repo_url,
            access_token=payload.access_token,
        )
        return _build_connection_response(db, repo)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except GitHubNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"GitHub repository not found: {str(e)}",
        )
    except GitHubAuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed or repository is private and requires a valid token: {str(e)}",
        )
    except GitHubRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        )
    except GitHubAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API error: {str(e)}",
        )


@router.get(
    "",
    response_model=RepositoryConnectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get GitHub repository connection and snapshot status",
)
def get_repository(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> RepositoryConnectionResponse:
    """Retrieve repository connection information and current snapshot."""
    _verify_project_exists(db, project_id)

    repo = GitHubRepositoryService.get_repository(db, project_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No GitHub repository connected for project '{project_id}'.",
        )

    return _build_connection_response(db, repo)


@router.post(
    "/sync",
    response_model=RepositorySyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Synchronize repository state and extract deterministic evidence",
)
def sync_repository(
    project_id: uuid.UUID,
    force: bool = Query(
        default=False,
        description="Whether to force re-synchronization even if commit SHA is unchanged",
    ),
    db: Session = Depends(get_db),
) -> RepositorySyncResponse:
    """Fetch latest commit, ingest file tree, and synthesize repository evidence."""
    _verify_project_exists(db, project_id)

    try:
        snapshot, is_new = GitHubRepositoryService.sync_repository(
            db=db,
            project_id=project_id,
            force=force,
        )

        status_msg = "synced" if is_new else "up_to_date"
        detail_msg = (
            f"Successfully synchronized commit {snapshot.commit_sha[:7]}."
            if is_new
            else f"Repository already up to date at commit {snapshot.commit_sha[:7]}."
        )

        return RepositorySyncResponse(
            status=status_msg,
            message=detail_msg,
            snapshot=RepositorySnapshotResponse.model_validate(snapshot),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except GitHubRepositoryOversizedError as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(e),
        )
    except GitHubRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        )
    except GitHubAuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except GitHubAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API error during sync: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synchronize repository: {str(e)}",
        )


@router.get(
    "/tree",
    response_model=List[RepositoryFileResponse],
    status_code=status.HTTP_200_OK,
    summary="Get repository file tree for active snapshot",
)
def get_repository_tree(
    project_id: uuid.UUID,
    path_prefix: Optional[str] = Query(default=None, description="Filter by directory prefix"),
    extension: Optional[str] = Query(default=None, description="Filter by file extension"),
    include_ignored: bool = Query(default=False, description="Whether to include ignored files"),
    db: Session = Depends(get_db),
) -> List[RepositoryFileResponse]:
    """List cataloged repository files from the active snapshot."""
    _verify_project_exists(db, project_id)

    repo = GitHubRepositoryService.get_repository(db, project_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No GitHub repository connected for project '{project_id}'.",
        )

    stmt = sa.select(RepositorySnapshot).where(
        RepositorySnapshot.repository_id == repo.id,
        RepositorySnapshot.is_current == True,
    )
    current_snapshot = db.scalars(stmt).first()
    if not current_snapshot:
        return []

    files = GitHubRepositoryService.get_snapshot_files(
        db=db,
        snapshot_id=current_snapshot.id,
        path_prefix=path_prefix,
        extension=extension,
        include_ignored=include_ignored,
    )
    return [RepositoryFileResponse.model_validate(f) for f in files]


@router.get(
    "/evidence",
    response_model=List[RepositoryEvidenceResponse],
    status_code=status.HTTP_200_OK,
    summary="Get structured repository evidence items for active snapshot",
)
def get_repository_evidence(
    project_id: uuid.UUID,
    evidence_type: Optional[str] = Query(default=None, description="Filter by evidence type"),
    db: Session = Depends(get_db),
) -> List[RepositoryEvidenceResponse]:
    """Retrieve extracted repository evidence (manifests, configs, entry points, test suites)."""
    _verify_project_exists(db, project_id)

    repo = GitHubRepositoryService.get_repository(db, project_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No GitHub repository connected for project '{project_id}'.",
        )

    stmt = sa.select(RepositorySnapshot).where(
        RepositorySnapshot.repository_id == repo.id,
        RepositorySnapshot.is_current == True,
    )
    current_snapshot = db.scalars(stmt).first()
    if not current_snapshot:
        return []

    evidence = GitHubRepositoryService.get_snapshot_evidence(
        db=db,
        snapshot_id=current_snapshot.id,
        evidence_type=evidence_type,
    )
    return [RepositoryEvidenceResponse.model_validate(e) for e in evidence]


@router.delete(
    "",
    status_code=status.HTTP_200_OK,
    summary="Disconnect GitHub repository and purge snapshots and evidence",
)
def disconnect_repository(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> dict:
    """Disconnect repository and delete associated records."""
    _verify_project_exists(db, project_id)

    deleted = GitHubRepositoryService.disconnect_repository(db, project_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No GitHub repository found to disconnect for project '{project_id}'.",
        )

    return {"status": "disconnected", "project_id": str(project_id)}
