import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ArtifactResponse(BaseModel):
    """Schema for returning artifact metadata."""

    id: uuid.UUID
    project_id: uuid.UUID
    original_filename: str = Field(..., description="Original filename as uploaded by user")
    stored_filename: str = Field(..., description="Unique filename on disk")
    file_type: str = Field(..., description="Semantic category of artifact")
    mime_type: str = Field(..., description="MIME type of file")
    file_size_bytes: int = Field(..., description="File size in bytes")
    status: str = Field(..., description="Artifact lifecycle status")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
