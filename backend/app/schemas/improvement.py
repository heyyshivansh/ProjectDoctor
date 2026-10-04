import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.finding import FindingSummaryResponse, HydratedEvidenceItem


class ImprovementItemUpdate(BaseModel):
    status: str


class ImprovementItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    
    # Track runs and findings
    original_run_id: Optional[uuid.UUID] = None
    latest_verification_run_id: Optional[uuid.UUID] = None
    
    # The current finding representing evidence
    finding_id: Optional[uuid.UUID] = None
    
    # Progress and System states
    status: str
    verification_status: str
    verification_detail: Optional[str] = None
    
    # Finding properties duplicated for ease of rendering
    title: str
    severity: str
    summary: str
    why_it_matters: str
    suggested_action: str
    
    # Evidence refs
    evidence_references: list = []
    hydrated_evidence: List[HydratedEvidenceItem] = []
    
    created_at: datetime
    updated_at: datetime


class ImprovementPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: uuid.UUID
    latest_verification_run_id: Optional[uuid.UUID] = None
    items: List[ImprovementItemResponse]
    is_empty: bool
    created_at: datetime
