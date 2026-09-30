import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.finding import FindingSummaryResponse, HydratedEvidenceItem


class ImprovementItemUpdate(BaseModel):
    status: str


class ImprovementItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    analysis_id: Optional[uuid.UUID]
    finding_id: uuid.UUID
    status: str
    
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
    analysis_id: Optional[uuid.UUID]
    items: List[ImprovementItemResponse]
    is_empty: bool
    created_at: datetime
