import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.project_service import ProjectService
from app.services.analysis.requirement_service import RequirementService
from app.schemas.requirement import (
    RequirementResponse,
    RequirementDetailResponse,
    RequirementEvidenceResponse,
    RequirementExtractionSummaryResponse,
    RequirementMetricsResponse,
)

router = APIRouter(prefix="/projects/{project_id}/requirements", tags=["requirements"])


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
    "/extract",
    response_model=RequirementExtractionSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract deterministic requirements and provenance for a project",
)
def extract_requirements(
    project_id: uuid.UUID,
    force_regenerate: bool = Query(
        default=False,
        description="Whether to purge deprecated requirements during extraction",
    ),
    db: Session = Depends(get_db),
) -> RequirementExtractionSummaryResponse:
    """Extract atomic requirements from declared project metadata and extracted documents.
    
    Adheres strictly to the Deterministic Extraction and No-Invention rules.
    """
    _verify_project_exists(db, project_id)

    try:
        summary = RequirementService.extract_project_requirements(
            db=db,
            project_id=project_id,
            force_regenerate=force_regenerate,
        )
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract requirements: {str(e)}",
        )


@router.get(
    "/summary",
    response_model=RequirementMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated metrics and distribution of project requirements",
)
def get_requirements_summary(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> RequirementMetricsResponse:
    """Retrieve aggregate requirement statistics, breakdown by category and status."""
    _verify_project_exists(db, project_id)

    return RequirementService.get_requirements_metrics(db=db, project_id=project_id)


@router.get(
    "",
    response_model=List[RequirementResponse],
    status_code=status.HTTP_200_OK,
    summary="List structured requirements for a project",
)
def list_requirements(
    project_id: uuid.UUID,
    category: Optional[str] = Query(default=None, description="Filter by category"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    is_ambiguous: Optional[bool] = Query(default=None, description="Filter by ambiguity"),
    search: Optional[str] = Query(default=None, description="Search in title or description"),
    db: Session = Depends(get_db),
) -> List[RequirementResponse]:
    """List all extracted requirements for a project with optional filtering."""
    _verify_project_exists(db, project_id)

    requirements = RequirementService.get_project_requirements(
        db=db,
        project_id=project_id,
        category=category,
        status=status,
        is_ambiguous=is_ambiguous,
        search=search,
    )

    return [
        RequirementResponse(
            id=r.id,
            project_id=r.project_id,
            requirement_id=r.requirement_id,
            title=r.title,
            description=r.description,
            category=r.category,
            priority=r.priority,
            actor=r.actor,
            status=r.status,
            is_ambiguous=r.is_ambiguous,
            conflict_summary=r.conflict_summary,
            content_hash=r.content_hash,
            evidence_count=len(r.evidence) if hasattr(r, "evidence") and r.evidence else 0,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in requirements
    ]


@router.get(
    "/{requirement_id}",
    response_model=RequirementDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single requirement with full provenance evidence",
)
def get_requirement(
    project_id: uuid.UUID,
    requirement_id: str,
    db: Session = Depends(get_db),
) -> RequirementDetailResponse:
    """Retrieve detailed requirement including all supporting evidence sources."""
    _verify_project_exists(db, project_id)

    req = RequirementService.get_requirement_detail(
        db=db,
        project_id=project_id,
        requirement_id=requirement_id,
    )

    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement '{requirement_id}' not found in project '{project_id}'",
        )

    evidence_items = [
        RequirementEvidenceResponse.model_validate(ev) for ev in (req.evidence or [])
    ]

    return RequirementDetailResponse(
        id=req.id,
        project_id=req.project_id,
        requirement_id=req.requirement_id,
        title=req.title,
        description=req.description,
        category=req.category,
        priority=req.priority,
        actor=req.actor,
        status=req.status,
        is_ambiguous=req.is_ambiguous,
        conflict_summary=req.conflict_summary,
        content_hash=req.content_hash,
        evidence_count=len(evidence_items),
        created_at=req.created_at,
        updated_at=req.updated_at,
        evidence=evidence_items,
    )
