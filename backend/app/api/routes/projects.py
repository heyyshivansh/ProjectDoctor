import uuid
from typing import List
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectListResponse,
    ProjectDetailResponse,
)
from app.schemas.artifact import ArtifactResponse
from app.services.project_service import ProjectService
from app.services.storage_service import (
    storage_service,
    EmptyFileError,
    FileTooLargeError,
    UnsupportedFileTypeError,
    StorageError,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new technical project",
)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    """Create a new technical project and store its metadata."""
    project = ProjectService.create_project(db, project_in)
    return ProjectResponse.model_validate(project)


@router.get(
    "",
    response_model=ProjectListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all projects with pagination",
)
def list_projects(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    db: Session = Depends(get_db),
) -> ProjectListResponse:
    """Retrieve a paginated list of projects including artifact counts."""
    items, total = ProjectService.list_projects(db, skip=skip, limit=limit)
    return ProjectListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get project details by UUID",
)
def get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ProjectDetailResponse:
    """Retrieve detailed metadata and attached artifacts for a specific project."""
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )
    return ProjectDetailResponse.model_validate(project)


@router.post(
    "/{project_id}/artifacts",
    response_model=ArtifactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an artifact for a project",
)
def upload_artifact(
    project_id: uuid.UUID,
    file: UploadFile = File(..., description="Binary artifact file to upload"),
    file_type: str = Form("other", description="Category of artifact"),
    db: Session = Depends(get_db),
) -> ArtifactResponse:
    """Upload a file, store it safely in local project storage, and record its metadata."""
    # 1. Verify project exists
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    # 2. Validate category
    category = file_type.strip().lower()
    if category not in settings.ALLOWED_FILE_TYPES:
        category = "other"

    # 3. Save file to isolated project storage
    original_filename = file.filename or "unnamed_artifact"
    try:
        file_info = storage_service.save_file(
            project_id=project_id,
            upload_file=file,
            original_filename=original_filename,
        )
    except UnsupportedFileTypeError as e:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=str(e),
        ) from e
    except FileTooLargeError as e:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(e),
        ) from e
    except EmptyFileError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except StorageError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    # 4. Persist artifact metadata with transactional cleanup on failure
    try:
        artifact = ProjectService.create_artifact(
            db=db,
            project_id=project_id,
            file_info=file_info,
            file_type=category,
        )
        return ArtifactResponse.model_validate(artifact)
    except Exception as e:
        # Transactional cleanup of disk file
        storage_service.cleanup_stored_file(project_id, file_info.stored_filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist artifact metadata in database.",
        ) from e


@router.get(
    "/{project_id}/artifacts",
    response_model=List[ArtifactResponse],
    status_code=status.HTTP_200_OK,
    summary="List all artifacts for a project",
)
def list_artifacts(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[ArtifactResponse]:
    """List all artifacts attached to the specified project."""
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )

    artifacts = ProjectService.list_artifacts(db, project_id)
    return [ArtifactResponse.model_validate(a) for a in artifacts]


@router.get(
    "/{project_id}/artifacts/{artifact_id}/download",
    status_code=status.HTTP_200_OK,
    summary="Download an uploaded artifact file",
)
def download_artifact(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> FileResponse:
    """Download an artifact file, enforcing project ownership and path boundary checks."""
    # Query enforcing ownership
    artifact = ProjectService.get_artifact(db, project_id=project_id, artifact_id=artifact_id)
    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact '{artifact_id}' not found for project '{project_id}'",
        )

    try:
        file_path = storage_service.get_file_path(project_id, artifact.stored_filename)
    except (FileNotFoundError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical artifact file not found in storage.",
        )

    return FileResponse(
        path=file_path,
        filename=artifact.original_filename,
        media_type=artifact.mime_type,
    )
