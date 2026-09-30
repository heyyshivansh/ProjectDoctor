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
