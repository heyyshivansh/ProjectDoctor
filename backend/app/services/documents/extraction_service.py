import os
import uuid
from typing import List, Optional
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.artifact import Artifact
from app.models.document_extraction import DocumentExtraction
from app.services.documents.base import BaseDocumentExtractor, ExtractionResult
from app.services.documents.pdf_extractor import PdfExtractor
from app.services.documents.docx_extractor import DocxExtractor
from app.services.documents.text_extractor import TextExtractor
from app.services.documents.fallback_extractor import FallbackExtractor
from app.services.documents.normalizer import TextNormalizer
from app.services.storage_service import storage_service


class DocumentExtractionService:
    """Orchestrates deterministic document extraction, normalization, and persistence."""

    @staticmethod
    def get_extractor_for_filename(filename: str) -> BaseDocumentExtractor:
        """Resolve the appropriate extractor instance based on file extension."""
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf":
            return PdfExtractor()
        elif ext == ".docx":
            return DocxExtractor()
        elif ext in (".md", ".txt"):
            return TextExtractor()
        else:
            return FallbackExtractor(ext)

    @classmethod
    def extract_artifact(
        cls,
        db: Session,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> Optional[DocumentExtraction]:
        """Extract text from an artifact file, normalize it, store to disk, and persist in DB."""
        # 1. Verify artifact exists and belongs to project
        stmt = sa.select(Artifact).where(
            Artifact.id == artifact_id,
            Artifact.project_id == project_id,
        )
        artifact = db.scalars(stmt).first()
        if not artifact:
            return None

        # 2. Select extractor and extract text from physical storage
        extractor = cls.get_extractor_for_filename(artifact.original_filename)
        try:
            file_path = storage_service.get_file_path(project_id, artifact.stored_filename)
            extraction_result: ExtractionResult = extractor.extract(str(file_path))
        except FileNotFoundError as e:
            extraction_result = ExtractionResult(
                status="failed",
                extractor_name=getattr(extractor, "__class__", type(extractor)).__name__,
                error_message=f"Physical file not found in storage: {str(e)}",
            )
        except Exception as e:
            extraction_result = ExtractionResult(
                status="failed",
                extractor_name=getattr(extractor, "__class__", type(extractor)).__name__,
                error_message=f"Extraction encountered an unexpected error: {str(e)}",
            )

        # 3. Process extraction outcome
        text_storage_path: Optional[str] = None
        text_preview: Optional[str] = None
        sections_data: List[dict] = []
        metrics: dict = {
            "word_count": 0,
            "character_count": 0,
            "page_count": extraction_result.page_count,
            "sha256_hash": None,
        }

        if extraction_result.status == "completed":
            # Normalize text
            normalized_text, was_truncated = TextNormalizer.normalize_text(
                extraction_result.raw_text
            )
            if was_truncated:
                extraction_result.metadata["truncated_text_limit"] = True

            # Calculate metrics
            metrics = TextNormalizer.calculate_metrics(
                normalized_text, page_count=extraction_result.page_count
            )

            # Store authoritative full text on disk (processed directory)
            text_storage_path = storage_service.save_processed_text(
                project_id=project_id,
                artifact_id=artifact_id,
                text=normalized_text,
            )

            # Text preview (first 500 chars) for lightweight list display
            text_preview = normalized_text[:500] if normalized_text else ""

            # Structured sections
            sections_data = [s.to_dict() for s in extraction_result.sections]

        # 4. Upsert DocumentExtraction record in database
        lookup_stmt = sa.select(DocumentExtraction).where(
            DocumentExtraction.artifact_id == artifact_id,
            DocumentExtraction.project_id == project_id,
        )
        db_extraction = db.scalars(lookup_stmt).first()

        if not db_extraction:
            db_extraction = DocumentExtraction(
                artifact_id=artifact_id,
                project_id=project_id,
                status=extraction_result.status,
                extractor_name=extraction_result.extractor_name,
                text_storage_path=text_storage_path,
                text_preview=text_preview,
                page_count=metrics.get("page_count"),
                word_count=metrics.get("word_count", 0),
                character_count=metrics.get("character_count", 0),
                sha256_hash=metrics.get("sha256_hash"),
                sections=sections_data,
                doc_metadata=extraction_result.metadata,
                error_message=extraction_result.error_message,
            )
            db.add(db_extraction)
        else:
            db_extraction.status = extraction_result.status
            db_extraction.extractor_name = extraction_result.extractor_name
            db_extraction.text_storage_path = text_storage_path
            db_extraction.text_preview = text_preview
            db_extraction.page_count = metrics.get("page_count")
            db_extraction.word_count = metrics.get("word_count", 0)
            db_extraction.character_count = metrics.get("character_count", 0)
            db_extraction.sha256_hash = metrics.get("sha256_hash")
            db_extraction.sections = sections_data
            db_extraction.doc_metadata = extraction_result.metadata
            db_extraction.error_message = extraction_result.error_message

        try:
            db.commit()
            db.refresh(db_extraction)
        except Exception:
            db.rollback()
            raise

        return db_extraction

    @classmethod
    def extract_all_project_artifacts(
        cls,
        db: Session,
        project_id: uuid.UUID,
    ) -> List[DocumentExtraction]:
        """Trigger document extraction for all artifacts attached to a project."""
        stmt = sa.select(Artifact.id).where(Artifact.project_id == project_id)
        artifact_ids = list(db.scalars(stmt).all())

        results: List[DocumentExtraction] = []
        for aid in artifact_ids:
            extraction = cls.extract_artifact(db, project_id, aid)
            if extraction:
                results.append(extraction)

        return results

    @staticmethod
    def get_artifact_extraction(
        db: Session,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> Optional[DocumentExtraction]:
        """Fetch the extraction record for a specific artifact enforcing project ownership."""
        stmt = sa.select(DocumentExtraction).where(
            DocumentExtraction.artifact_id == artifact_id,
            DocumentExtraction.project_id == project_id,
        )
        return db.scalars(stmt).first()

    @staticmethod
    def list_project_extractions(
        db: Session,
        project_id: uuid.UUID,
        status_filter: Optional[str] = None,
    ) -> List[DocumentExtraction]:
        """List all extraction records for a project."""
        stmt = sa.select(DocumentExtraction).where(
            DocumentExtraction.project_id == project_id
        )
        if status_filter:
            stmt = stmt.where(DocumentExtraction.status == status_filter)
        stmt = stmt.order_by(DocumentExtraction.created_at.desc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def delete_artifact_extraction(
        db: Session,
        project_id: uuid.UUID,
        artifact_id: uuid.UUID,
    ) -> bool:
        """Delete an extraction record from database and its processed text file from disk."""
        stmt = sa.select(DocumentExtraction).where(
            DocumentExtraction.artifact_id == artifact_id,
            DocumentExtraction.project_id == project_id,
        )
        extraction = db.scalars(stmt).first()
        if not extraction:
            return False

        # Remove processed disk file
        storage_service.delete_processed_text(project_id, artifact_id)

        db.delete(extraction)
        try:
            db.commit()
            return True
        except Exception:
            db.rollback()
            raise
