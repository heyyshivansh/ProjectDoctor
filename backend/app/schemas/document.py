import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class DocumentSectionSchema(BaseModel):
    """Outline section detected in an extracted document."""
    model_config = ConfigDict(from_attributes=True)

    title: str
    level: int = 1
    start_char: int = 0
    end_char: int = 0
    text_preview: str = ""


class DocumentExtractionSummary(BaseModel):
    """Lightweight summary of document extraction status and metrics."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    artifact_id: uuid.UUID
    project_id: uuid.UUID
    status: str
    extractor_name: str
    page_count: Optional[int] = None
    word_count: int = 0
    character_count: int = 0
    sha256_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None


class DocumentExtractionResponse(DocumentExtractionSummary):
    """Full extraction details including sections outline and text preview."""
    text_storage_path: Optional[str] = None
    text_preview: Optional[str] = None
    sections: List[DocumentSectionSchema] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def resolve_metadata_field(cls, data: Any) -> Any:
        if hasattr(data, "doc_metadata"):
            return {
                "id": data.id,
                "artifact_id": data.artifact_id,
                "project_id": data.project_id,
                "status": data.status,
                "extractor_name": data.extractor_name,
                "text_storage_path": data.text_storage_path,
                "text_preview": data.text_preview,
                "page_count": data.page_count,
                "word_count": data.word_count,
                "character_count": data.character_count,
                "sha256_hash": data.sha256_hash,
                "sections": data.sections or [],
                "metadata": data.doc_metadata or {},
                "error_message": data.error_message,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
            }
        return data


class BatchExtractionResponse(BaseModel):
    """Response returned when batch extracting all artifacts for a project."""
    total_processed: int
    completed_count: int
    skipped_count: int
    failed_count: int
    extractions: List[DocumentExtractionSummary]
