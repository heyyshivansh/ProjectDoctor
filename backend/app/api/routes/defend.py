import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.defend import (
    DefendSessionCreateResponse,
    DefendSessionResponse,
    DefendQuestionResponse,
    DefendAttemptCreate,
    DefendAttemptResponse,
)
from app.services.defend.defend_service import DefendService

router = APIRouter()

@router.post(
    "/{project_id}/defend/sessions",
    response_model=DefendSessionCreateResponse,
    summary="Start or Get Defend Session",
)
def start_defend_session(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Start a new Defend practice session for the latest completed analysis run,
    or return the active one if it already exists.
    """
    return DefendService.start_or_get_session(db=db, project_id=project_id)

@router.get(
    "/{project_id}/defend/sessions/{session_id}",
    response_model=DefendSessionResponse,
    summary="Get Defend Session",
)
def get_defend_session(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific practice session by its ID.
    """
    return DefendService.get_session(db=db, project_id=project_id, session_id=session_id)

@router.post(
    "/{project_id}/defend/questions/{question_id}/attempts",
    response_model=DefendAttemptResponse,
    summary="Submit an attempt to a Defend Question",
)
def submit_defend_attempt(
    project_id: uuid.UUID,
    question_id: uuid.UUID,
    attempt_in: DefendAttemptCreate,
    db: Session = Depends(get_db),
):
    """
    Submit an answer to a question and receive AI feedback grounded in project evidence.
    """
    return DefendService.submit_attempt(
        db=db, project_id=project_id, question_id=question_id, student_answer=attempt_in.student_answer
    )

@router.post(
    "/{project_id}/defend/questions/{question_id}/skip",
    response_model=DefendQuestionResponse,
    summary="Skip a Defend Question",
)
def skip_defend_question(
    project_id: uuid.UUID,
    question_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Skip a Defend Question without receiving feedback.
    """
    return DefendService.skip_question(db=db, project_id=project_id, question_id=question_id)

@router.post(
    "/{project_id}/defend/attempts/{attempt_id}/retry",
    response_model=DefendAttemptResponse,
    summary="Retry generating AI feedback for a Defend attempt",
)
def retry_defend_attempt_feedback(
    project_id: uuid.UUID,
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Retry the AI feedback generation if it previously failed or timed out.
    """
    return DefendService.retry_attempt_feedback(
        db=db, project_id=project_id, attempt_id=attempt_id
    )

@router.post(
    "/{project_id}/defend/sessions/{session_id}/complete",
    response_model=DefendSessionResponse,
    summary="Complete a Defend session and generate a recap",
)
def complete_defend_session(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Complete the Defend session and generate an end-of-session recap based on answers.
    """
    return DefendService.complete_session(
        db=db, project_id=project_id, session_id=session_id
    )
