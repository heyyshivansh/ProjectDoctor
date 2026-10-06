import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.analysis_run import AnalysisRun


class DefendSession(Base):
    """A practice session tied to a specific analysis snapshot."""
    __tablename__ = "defend_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    analysis_run_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="active")
    session_recap: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()
    )

    project: Mapped["Project"] = relationship("Project")
    analysis_run: Mapped["AnalysisRun"] = relationship("AnalysisRun")
    questions: Mapped[List["DefendQuestion"]] = relationship(
        "DefendQuestion", back_populates="session", cascade="all, delete-orphan", order_by="DefendQuestion.created_at"
    )


class DefendQuestion(Base):
    """A specific practice question grounded in project evidence."""
    __tablename__ = "defend_questions"
    
    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("defend_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    question_text: Mapped[str] = mapped_column(sa.Text, nullable=False)
    evidence_type: Mapped[str] = mapped_column(sa.String(50), nullable=False) # e.g. "finding", "requirement"
    evidence_id: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    evidence_context: Mapped[str] = mapped_column(sa.Text, nullable=False) # Context string or json
    
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="unanswered")
    
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    )

    session: Mapped["DefendSession"] = relationship("DefendSession", back_populates="questions")
    attempts: Mapped[List["DefendAttempt"]] = relationship(
        "DefendAttempt", back_populates="question", cascade="all, delete-orphan", order_by="DefendAttempt.created_at"
    )


class DefendAttempt(Base):
    """A student's answer and the AI's feedback for a DefendQuestion."""
    __tablename__ = "defend_attempts"
    
    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid, primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("defend_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    student_answer: Mapped[str] = mapped_column(sa.Text, nullable=False)
    ai_feedback: Mapped[str] = mapped_column(sa.Text, nullable=True)
    is_supported: Mapped[bool] = mapped_column(sa.Boolean, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
    )

    question: Mapped["DefendQuestion"] = relationship("DefendQuestion", back_populates="attempts")

