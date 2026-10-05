import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class DefendAttemptCreate(BaseModel):
    student_answer: str

class DefendAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    question_id: uuid.UUID
    student_answer: str
    ai_feedback: Optional[str] = None
    created_at: datetime

class DefendQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    session_id: uuid.UUID
    question_text: str
    evidence_type: str
    evidence_id: str
    evidence_context: str
    status: str
    created_at: datetime
    attempts: List[DefendAttemptResponse] = []

class DefendSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    project_id: uuid.UUID
    analysis_run_id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime
    is_stale: bool = False
    session_recap: Optional[str] = None
    questions: List[DefendQuestionResponse] = []

class DefendSessionCreateResponse(BaseModel):
    session: DefendSessionResponse
    message: str
