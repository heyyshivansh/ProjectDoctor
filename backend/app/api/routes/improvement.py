import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.improvement import (
    ImprovementPlanResponse,
    ImprovementItemResponse,
    ImprovementItemUpdate,
)
from app.services.improvement.improvement_service import ImprovementService


router = APIRouter()

@router.get(
    "/{project_id}/improvement-plan",
    response_model=ImprovementPlanResponse,
    summary="Get Improvement Plan",
    description="Retrieves the improvement plan for the project based on the latest completed diagnosis.",
)
def get_improvement_plan(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return ImprovementService.get_improvement_plan(db=db, project_id=project_id)


@router.patch(
    "/{project_id}/improvement-plan/items/{item_id}",
    response_model=ImprovementItemResponse,
    summary="Update Improvement Item Status",
    description="Updates the progress status of a specific improvement plan item.",
)
def update_improvement_item_status(
    project_id: uuid.UUID,
    item_id: uuid.UUID,
    update_data: ImprovementItemUpdate,
    db: Session = Depends(get_db),
):
    return ImprovementService.update_item_status(
        db=db, project_id=project_id, item_id=item_id, update_data=update_data
    )

from fastapi import HTTPException
from app.models.analysis_run import AnalysisRun
import sqlalchemy as sa

@router.post(
    "/{project_id}/improvement-plan/reconcile",
    summary="Retry Reconciliation",
    description="Idempotently retries the verification of improvements against the latest completed run.",
)
def reconcile_improvement_plan(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    # Find latest completed analysis run
    latest_run = db.scalars(
        sa.select(AnalysisRun)
        .where(
            AnalysisRun.project_id == project_id,
            AnalysisRun.deterministic_status == "completed",
        )
        .order_by(AnalysisRun.created_at.desc())
        .limit(1)
    ).first()

    if not latest_run:
        raise HTTPException(status_code=400, detail="No completed deterministic run available to reconcile.")

    from app.services.analysis.orchestrator import ProjectAnalysisOrchestrator
    current_fingerprint = ProjectAnalysisOrchestrator._compute_input_fingerprint(db, project_id, latest_run.snapshot_id)
    if latest_run.input_fingerprint != current_fingerprint:
        raise HTTPException(status_code=400, detail="The latest run is stale. Please re-analyze the project.")

    ImprovementService.reconcile_improvements(db, project_id, latest_run.id)
    return {"message": "Reconciliation completed successfully", "run_id": str(latest_run.id)}

