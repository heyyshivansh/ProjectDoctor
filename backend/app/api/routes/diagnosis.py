import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.project_service import ProjectService
from app.services.analysis.diagnostic_service import DiagnosticService
from app.schemas.finding import (
    FindingSummaryResponse,
    FindingDetailResponse,
    ProjectDiagnosisResponse,
    DiagnosisGenerationResponse,
)

router = APIRouter(prefix="/projects/{project_id}", tags=["diagnosis"])


def _verify_project_exists(db: Session, project_id: uuid.UUID):
    """Verify that the project exists, else raise 404."""
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found",
        )
    return project


@router.get(
    "/diagnosis",
    response_model=ProjectDiagnosisResponse,
    status_code=status.HTTP_200_OK,
    summary="Get project diagnosis (strictly read-only)",
)
def get_project_diagnosis(
    project_id: uuid.UUID,
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to inspect diagnosis for (defaults to active snapshot)",
    ),
    db: Session = Depends(get_db),
) -> ProjectDiagnosisResponse:
    """Retrieve the current project diagnosis, health status, and prioritized findings."""
    _verify_project_exists(db, project_id)

    try:
        return DiagnosticService.get_diagnosis(
            db=db,
            project_id=project_id,
            snapshot_id=snapshot_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve project diagnosis: {str(e)}",
        )


@router.post(
    "/diagnosis/generate",
    response_model=DiagnosisGenerationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate or regenerate deterministic project diagnosis",
)
def generate_project_diagnosis(
    project_id: uuid.UUID,
    force: bool = Query(
        default=False,
        description="Whether to purge obsolete findings for the snapshot scope",
    ),
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Optional snapshot UUID to evaluate (defaults to active snapshot)",
    ),
    db: Session = Depends(get_db),
) -> DiagnosisGenerationResponse:
    """Explicitly trigger deterministic diagnostic evaluation across specifications, repository, and traceability."""
    _verify_project_exists(db, project_id)

    try:
        diagnosis = DiagnosticService.generate_diagnosis(
            db=db,
            project_id=project_id,
            snapshot_id=snapshot_id,
            force=force,
        )
        return DiagnosisGenerationResponse(
            status="completed",
            message=f"Diagnosis generated with status '{diagnosis.status_label}'.",
            diagnosis=diagnosis,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate project diagnosis: {str(e)}",
        )


@router.get(
    "/findings",
    response_model=List[FindingSummaryResponse],
    status_code=status.HTTP_200_OK,
    summary="List diagnostic findings for project",
)
def list_project_findings(
    project_id: uuid.UUID,
    severity: Optional[str] = Query(
        default=None,
        description="Filter by severity: critical, major, needs_attention, improvement, strength",
    ),
    finding_type: Optional[str] = Query(
        default=None,
        description="Filter by finding type",
    ),
    snapshot_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Filter by snapshot UUID",
    ),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> List[FindingSummaryResponse]:
    """Retrieve list of findings for a project with optional filters and pagination."""
    _verify_project_exists(db, project_id)

    return DiagnosticService.list_findings(
        db=db,
        project_id=project_id,
        severity=severity,
        finding_type=finding_type,
        snapshot_id=snapshot_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/findings/{finding_id}",
    response_model=FindingDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get detailed finding with hydrated canonical evidence",
)
def get_finding_detail(
    project_id: uuid.UUID,
    finding_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> FindingDetailResponse:
    """Retrieve full finding detail including on-demand hydrated canonical evidence and technical data."""
    _verify_project_exists(db, project_id)

    try:
        return DiagnosticService.get_finding_detail(
            db=db,
            project_id=project_id,
            finding_id=finding_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve finding detail: {str(e)}",
        )
