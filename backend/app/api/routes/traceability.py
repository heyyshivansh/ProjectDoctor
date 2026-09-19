import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.project_service import ProjectService
from app.services.analysis.traceability_service import TraceabilityService
from app.schemas.traceability import (
    RequirementTraceabilitySummaryResponse,
    RequirementTraceabilityDetailResponse,
    TraceabilityMetricsResponse,
    TraceabilityGenerationResponse,
)

router = APIRouter(prefix="/projects/{project_id}/traceability", tags=["traceability"])


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
    "/generate",
    response_model=TraceabilityGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate deterministic requirement-to-implementation traceability",
)
def generate_traceability(
    project_id: uuid.UUID,
    force: bool = Query(
        default=False,
        description="Whether to purge previous traceability results for the snapshot",
    ),
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to evaluate (defaults to active snapshot)",
    ),
    db: Session = Depends(get_db),
) -> TraceabilityGenerationResponse:
    """Scan the repository snapshot and link candidate implementation files and tests to requirements."""
    _verify_project_exists(db, project_id)

    try:
        response = TraceabilityService.generate_traceability(
            db=db,
            project_id=project_id,
            snapshot_id=snapshot_id,
            force=force,
        )
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate requirement traceability: {str(e)}",
        )


@router.get(
    "/summary",
    response_model=TraceabilityMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get overall project requirement traceability metrics and distribution",
)
def get_traceability_summary(
    project_id: uuid.UUID,
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to query metrics for",
    ),
    db: Session = Depends(get_db),
) -> TraceabilityMetricsResponse:
    """Retrieve aggregate traceability statistics, coverage rate, and breakdown by status."""
    _verify_project_exists(db, project_id)

    return TraceabilityService.get_traceability_metrics(
        db=db,
        project_id=project_id,
        snapshot_id=snapshot_id,
    )


@router.get(
    "",
    response_model=List[RequirementTraceabilitySummaryResponse],
    status_code=status.HTTP_200_OK,
    summary="List requirement traceability statuses for active or specified snapshot",
)
def list_project_traceability(
    project_id: uuid.UUID,
    status: Optional[str] = Query(
        default=None,
        description="Filter by traceability status (unmatched, candidate, candidate_with_tests, ambiguous)",
    ),
    search: Optional[str] = Query(
        default=None,
        description="Search by requirement code, title, or description",
    ),
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to filter by",
    ),
    db: Session = Depends(get_db),
) -> List[RequirementTraceabilitySummaryResponse]:
    """Retrieve high-level requirement cards with candidate implementation and test summaries."""
    _verify_project_exists(db, project_id)

    return TraceabilityService.get_project_traceability(
        db=db,
        project_id=project_id,
        status=status,
        search=search,
        snapshot_id=snapshot_id,
    )


@router.get(
    "/{requirement_id}",
    response_model=RequirementTraceabilityDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get deep-dive traceability details for a single requirement",
)
def get_requirement_traceability(
    project_id: uuid.UUID,
    requirement_id: str,
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to query for",
    ),
    db: Session = Depends(get_db),
) -> RequirementTraceabilityDetailResponse:
    """Retrieve complete traceability view including specification quotes, code links, and jury advice."""
    _verify_project_exists(db, project_id)

    detail = TraceabilityService.get_requirement_traceability_detail(
        db=db,
        project_id=project_id,
        requirement_code_or_id=requirement_id,
        snapshot_id=snapshot_id,
    )

    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement '{requirement_id}' not found in project '{project_id}'",
        )

    return detail
