import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.project_service import ProjectService
from app.services.documents.extraction_service import DocumentExtractionService
from app.services.storage_service import storage_service
from app.schemas.document import (
    DocumentExtractionResponse,
    DocumentExtractionSummary,
    BatchExtractionResponse,
)

router = APIRouter(prefix="/projects/{project_id}", tags=["documents"])


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
    "/artifacts/{artifact_id}/extraction",
    response_model=DocumentExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract text and outline from an artifact",
)
def extract_single_artifact(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> DocumentExtractionResponse:
    """Trigger deterministic text extraction for a specific artifact."""
    _verify_project_exists(db, project_id)

    extraction = DocumentExtractionService.extract_artifact(
        db=db,
        project_id=project_id,
        artifact_id=artifact_id,
    )
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact with ID '{artifact_id}' not found in project '{project_id}'",
        )

    return DocumentExtractionResponse.model_validate(extraction)


@router.post(
    "/documents/extract",
    response_model=BatchExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch extract all artifacts for a project",
)
def batch_extract_documents(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> BatchExtractionResponse:
    """Trigger text extraction for all extractable artifacts attached to a project."""
    _verify_project_exists(db, project_id)

    extractions = DocumentExtractionService.extract_all_project_artifacts(
        db=db,
        project_id=project_id,
    )

    completed_count = sum(1 for e in extractions if e.status == "completed")
    skipped_count = sum(1 for e in extractions if e.status == "skipped_unsupported_type")
    failed_count = sum(1 for e in extractions if e.status == "failed")

    return BatchExtractionResponse(
        total_processed=len(extractions),
        completed_count=completed_count,
        skipped_count=skipped_count,
        failed_count=failed_count,
        extractions=[DocumentExtractionSummary.model_validate(e) for e in extractions],
    )


@router.get(
    "/documents/extractions",
    response_model=List[DocumentExtractionSummary],
    status_code=status.HTTP_200_OK,
    summary="List extraction summaries for all artifacts in a project",
)
def list_document_extractions(
    project_id: uuid.UUID,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
) -> List[DocumentExtractionSummary]:
    """Retrieve extraction statuses and metrics for all artifacts of a project."""
    _verify_project_exists(db, project_id)

    extractions = DocumentExtractionService.list_project_extractions(
        db=db,
        project_id=project_id,
        status_filter=status_filter,
    )
    return [DocumentExtractionSummary.model_validate(e) for e in extractions]


@router.get(
    "/artifacts/{artifact_id}/extraction",
    response_model=DocumentExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Get extraction details for an artifact",
)
def get_artifact_extraction(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> DocumentExtractionResponse:
    """Retrieve detailed extraction record, metrics, text preview, and outline sections."""
    _verify_project_exists(db, project_id)

    extraction = DocumentExtractionService.get_artifact_extraction(
        db=db,
        project_id=project_id,
        artifact_id=artifact_id,
    )
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extraction record not found for artifact '{artifact_id}' in project '{project_id}'",
        )

    return DocumentExtractionResponse.model_validate(extraction)


@router.get(
    "/artifacts/{artifact_id}/extracted-text",
    status_code=status.HTTP_200_OK,
    summary="Stream raw extracted text file for an artifact",
)
def stream_extracted_text(
    project_id: uuid.UUID,
    artifact_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> FileResponse:
    """Stream the full raw extracted text directly from authoritative disk storage."""
    _verify_project_exists(db, project_id)

    extraction = DocumentExtractionService.get_artifact_extraction(
        db=db,
        project_id=project_id,
        artifact_id=artifact_id,
    )
    if not extraction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Extraction record not found for artifact '{artifact_id}'",
        )

    if extraction.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extracted text unavailable. Artifact extraction status is '{extraction.status}'.",
        )

    try:
        file_path = storage_service.get_processed_text_path(project_id, artifact_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical extracted text file not found in storage.",
        )

    return FileResponse(
        path=str(file_path),
        filename=f"{artifact_id}_extracted.txt",
        media_type="text/plain; charset=utf-8",
    )
