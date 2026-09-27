import uuid
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.orchestrator import (
    AnalysisStatusResponse,
    AnalysisTriggerRequest,
)
from app.services.analysis.orchestrator import ProjectAnalysisOrchestrator
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}", tags=["analysis"])


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
    "/analyze",
    response_model=AnalysisStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger comprehensive project analysis (async 202)",
)
def trigger_project_analysis(
    project_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    response: Response,
    payload: Optional[AnalysisTriggerRequest] = None,
    force: bool = Query(
        default=False,
        description="Whether to bypass caches and force fresh sync and re-evaluation across all stages.",
    ),
    db: Session = Depends(get_db),
) -> AnalysisStatusResponse:
    """Initiates the 7-stage project evaluation pipeline.
    Validates pre-flight evidence, sets persistent analyzing state, registers in-memory execution,
    and returns 202 Accepted immediately while pipeline executes in background.
    """
    _verify_project_exists(db, project_id)

    # Allow force from either query param or JSON payload
    effective_force = force or (payload.force if payload else False)

    status_resp = ProjectAnalysisOrchestrator.trigger_analysis(
        db=db,
        project_id=project_id,
        background_tasks=background_tasks,
        force=effective_force,
    )

    # If already running, return 200 OK instead of 202 Accepted
    if status_resp.message == "Analysis is already actively running.":
        response.status_code = status.HTTP_200_OK

    return status_resp


@router.get(
    "/analysis-status",
    response_model=AnalysisStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get project evaluation status (strictly read-only)",
)
def get_project_analysis_status(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> AnalysisStatusResponse:
    """Returns truthful evaluation status, active stage progress, staleness, or restart interruption."""
    _verify_project_exists(db, project_id)

    return ProjectAnalysisOrchestrator.get_analysis_status(
        db=db,
        project_id=project_id,
    )
