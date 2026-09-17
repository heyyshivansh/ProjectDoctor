import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.project_service import ProjectService
from app.services.analysis.understanding_service import ProjectUnderstandingService
from app.schemas.understanding import ProjectUnderstandingResponse

router = APIRouter(prefix="/projects/{project_id}/understanding", tags=["understanding"])


def _verify_project_exists(db: Session, project_id: uuid.UUID):
    """Verify that the project exists, else raise 404."""
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )
    return project


@router.post(
    "",
    response_model=ProjectUnderstandingResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate deterministic project understanding representation",
)
def generate_project_understanding(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ProjectUnderstandingResponse:
    """Synthesize the 11-dimensional project understanding from project metadata and extracted documents.
    
    STRICT NO-INVENTION RULE: Missing dimensions remain strictly null or [].
    """
    _verify_project_exists(db, project_id)

    understanding = ProjectUnderstandingService.generate_understanding(
        db=db,
        project_id=project_id,
    )
    if not understanding:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate project understanding representation.",
        )

    return ProjectUnderstandingResponse.model_validate(understanding)


@router.get(
    "",
    response_model=ProjectUnderstandingResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current project understanding representation",
)
def get_project_understanding(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> ProjectUnderstandingResponse:
    """Retrieve the current structured project understanding representation."""
    _verify_project_exists(db, project_id)

    understanding = ProjectUnderstandingService.get_understanding(
        db=db,
        project_id=project_id,
    )
    if not understanding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project understanding has not been generated yet for project '{project_id}'. Trigger POST /api/projects/{project_id}/understanding to generate it.",
        )

    return ProjectUnderstandingResponse.model_validate(understanding)
