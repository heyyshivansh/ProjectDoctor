import logging
logger = logging.getLogger(__name__)
from app.services.ai.factory import get_configured_ai_provider
import uuid
import json
from typing import List
from sqlalchemy.orm import Session
import sqlalchemy as sa
from fastapi import HTTPException

from app.models.analysis_run import AnalysisRun
from app.models.finding import Finding
from app.models.defend import DefendSession, DefendQuestion, DefendAttempt
from app.schemas.defend import (
    DefendSessionCreateResponse,
    DefendSessionResponse,
    DefendAttemptResponse,
)

from app.services.ai.factory import get_configured_ai_provider

class DefendService:
    @staticmethod
    def start_or_get_session(db: Session, project_id: uuid.UUID) -> dict:
        latest_run = db.scalars(
            sa.select(AnalysisRun)
            .where(
                AnalysisRun.project_id == project_id,
                AnalysisRun.deterministic_status == "completed",
            )
            .order_by(AnalysisRun.created_at.desc())
            .limit(1)
        ).first()

        if not latest_run:
            raise HTTPException(status_code=400, detail="No completed deterministic run available. Analyze the project first.")

        from app.services.analysis.orchestrator import ProjectAnalysisOrchestrator
        from app.models.github_repository import RepositorySnapshot

        active_snapshot = db.scalars(
            sa.select(RepositorySnapshot).where(
                RepositorySnapshot.project_id == project_id,
                RepositorySnapshot.is_current == True,
            )
        ).first()
        snapshot_id = active_snapshot.id if active_snapshot else None

        current_fingerprint = ProjectAnalysisOrchestrator._compute_input_fingerprint(db, project_id, snapshot_id)

        if latest_run.input_fingerprint != current_fingerprint:
            raise HTTPException(
                status_code=409,
                detail="The repository or requirements have changed. Please run analysis again to practice."
            )

        # check for existing active session for this run
        existing_session = db.scalars(
            sa.select(DefendSession)
            .where(
                DefendSession.project_id == project_id,
                DefendSession.analysis_run_id == latest_run.id,
                DefendSession.status == "active"
            )
        ).first()

        if existing_session:
            return {"session": existing_session, "message": "Retrieved existing active practice session."}

        # Fetch findings
        findings = db.scalars(
            sa.select(Finding)
            .where(
                Finding.project_id == project_id,
                Finding.snapshot_id == latest_run.snapshot_id
            )
            .limit(3)
        ).all()

        # Fetch traces
        from app.models.traceability import RequirementSnapshotTraceability
        traces = db.scalars(
            sa.select(RequirementSnapshotTraceability)
            .options(
                sa.orm.joinedload(RequirementSnapshotTraceability.requirement),
                sa.orm.joinedload(RequirementSnapshotTraceability.links)
            )
            .where(
                RequirementSnapshotTraceability.project_id == project_id,
                RequirementSnapshotTraceability.snapshot_id == latest_run.snapshot_id
            )
            .limit(3)
        ).unique().all()

        if not findings and not traces:
            raise HTTPException(
                status_code=400,
                detail="No usable evidence was found in the latest analysis. Ensure your project has requirements and repository evidence."
            )

        # Create new session since we know there is evidence
        session = DefendSession(
            project_id=project_id,
            analysis_run_id=latest_run.id,
            status="active"
        )
        db.add(session)
        db.flush()


        finding_contexts = {}
        for f in findings:
            finding_contexts[str(f.id)] = {
                "id": str(f.id),
                "type": "finding",
                "title": f.title,
                "summary": f.summary,
                "why_it_matters": f.why_it_matters,
                "severity": f.severity,
                "evidence_references": f.evidence_references
            }

        trace_contexts = {}
        for t in traces:
            req_title = t.requirement.title if t.requirement else f"Requirement {t.requirement_id}"
            links_data = []
            for link in t.links[:3]:  # Top 3 links for context
                links_data.append({
                    "id": str(link.id),
                    "file_path": link.file_path,
                    "is_test_evidence": link.is_test_evidence,
                    "code_snippet": link.code_snippet,
                    "match_rationale": link.match_rationale
                })

            trace_contexts[str(t.id)] = {
                "id": str(t.id),
                "type": "requirement_trace",
                "requirement_id": str(t.requirement_id),
                "requirement_title": req_title,
                "status": t.status,
                "implementation_count": t.implementation_count,
                "links": links_data
            }

        evidence_package = {
            "findings": list(finding_contexts.values()),
            "traces": list(trace_contexts.values())
        }

        ai_drafted_questions = None
        try:
            llm = get_configured_ai_provider()
            ai_drafted_questions = llm.generate_defend_questions(evidence_package)
        except Exception as e:
            logger.warning(f"AI question generation failed, falling back to deterministic templates: {e}")

        if ai_drafted_questions:
            for q_data in ai_drafted_questions:
                e_type = q_data["evidence_type"]
                e_id = q_data["evidence_id"]
                ctx = finding_contexts[e_id] if e_type == "finding" else trace_contexts[e_id]
                
                question = DefendQuestion(
                    session_id=session.id,
                    question_text=q_data["question_text"],
                    evidence_type=e_type,
                    evidence_id=e_id,
                    evidence_context=json.dumps(ctx),
                    status="unanswered"
                )
                db.add(question)
        else:
            for f in findings:
                q_text = f"The analysis observed '{f.title}'. Explain what this evidence shows about the project and what might remain unaddressed."
                question = DefendQuestion(
                    session_id=session.id,
                    question_text=q_text,
                    evidence_type="finding",
                    evidence_id=str(f.id),
                    evidence_context=json.dumps(finding_contexts[str(f.id)]),
                    status="unanswered"
                )
                db.add(question)
                
            for t in traces:
                req_title = t.requirement.title if t.requirement else f"Requirement {t.requirement_id}"
                q_text = f"The analysis linked evidence to the requirement '{req_title}'. Explain how the supplied evidence relates to this requirement and what might remain uncertain."
                question = DefendQuestion(
                    session_id=session.id,
                    question_text=q_text,
                    evidence_type="requirement_trace",
                    evidence_id=str(t.id),
                    evidence_context=json.dumps(trace_contexts[str(t.id)]),
                    status="unanswered"
                )
                db.add(question)

        db.commit()
        db.refresh(session)
        
        return {"session": session, "message": "Created new practice session based on the latest analysis."}

    @staticmethod
    def get_session(db: Session, project_id: uuid.UUID, session_id: uuid.UUID):
        session = db.scalars(
            sa.select(DefendSession)
            .where(
                DefendSession.id == session_id,
                DefendSession.project_id == project_id
            )
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
            
        # compute staleness
        from app.services.analysis.orchestrator import ProjectAnalysisOrchestrator
        from app.models.github_repository import RepositorySnapshot

        active_snapshot = db.scalars(
            sa.select(RepositorySnapshot).where(
                RepositorySnapshot.project_id == project_id,
                RepositorySnapshot.is_current == True,
            )
        ).first()
        snapshot_id = active_snapshot.id if active_snapshot else None
        current_fingerprint = ProjectAnalysisOrchestrator._compute_input_fingerprint(db, project_id, snapshot_id)

        # get run for this session
        run = db.scalars(
            sa.select(AnalysisRun).where(AnalysisRun.id == session.analysis_run_id)
        ).first()

        if run and run.input_fingerprint != current_fingerprint:
            session.is_stale = True
        else:
            session.is_stale = False
        
        return session

    @staticmethod
    def submit_attempt(db: Session, project_id: uuid.UUID, question_id: uuid.UUID, student_answer: str):
        question = db.scalars(
            sa.select(DefendQuestion)
            .join(DefendSession)
            .where(
                DefendQuestion.id == question_id,
                DefendSession.project_id == project_id
            )
        ).first()

        if not question:
            raise HTTPException(status_code=404, detail="Question not found.")

        # Create attempt
        attempt = DefendAttempt(
            question_id=question_id,
            student_answer=student_answer,
            ai_feedback=None,
            is_supported=None
        )
        db.add(attempt)
        question.status = "answered"
        db.commit() # Commit immediately so it is not lost if provider lookup/generation fails
        db.refresh(attempt)

        try:
            llm = get_configured_ai_provider()
            evidence_context = json.loads(question.evidence_context)
            resp = llm.evaluate_defend_attempt(
                evidence_context=evidence_context,
                question=question.question_text,
                student_answer=student_answer
            )
            attempt.ai_feedback = resp.get("feedback", "Unable to generate specific feedback.")
        except Exception:
            attempt.ai_feedback = None
        
        db.commit()
        db.refresh(attempt)
        
        return attempt

    @staticmethod
    def skip_question(db: Session, project_id: uuid.UUID, question_id: uuid.UUID):
        question = db.scalars(
            sa.select(DefendQuestion)
            .join(DefendSession)
            .where(
                DefendQuestion.id == question_id,
                DefendSession.project_id == project_id
            )
        ).first()

        if not question:
            raise HTTPException(status_code=404, detail="Question not found.")

        question.status = "skipped"
        db.commit()
        db.refresh(question)
        return question

    @staticmethod
    def retry_attempt_feedback(db: Session, project_id: uuid.UUID, attempt_id: uuid.UUID):
        attempt = db.scalars(
            sa.select(DefendAttempt)
            .join(DefendQuestion)
            .join(DefendSession)
            .where(
                DefendAttempt.id == attempt_id,
                DefendSession.project_id == project_id
            )
        ).first()

        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found.")

        if attempt.ai_feedback is not None:
            raise HTTPException(status_code=400, detail="Feedback is already available for this attempt.")

        try:
            llm = get_configured_ai_provider()
            evidence_context = json.loads(attempt.question.evidence_context)
            resp = llm.evaluate_defend_attempt(
                evidence_context=evidence_context,
                question=attempt.question.question_text,
                student_answer=attempt.student_answer
            )
            attempt.ai_feedback = resp.get("feedback", "Unable to generate specific feedback.")
        except Exception:
            attempt.ai_feedback = None
            
        db.commit()
        db.refresh(attempt)
        return attempt

    @staticmethod
    def complete_session(db: Session, project_id: uuid.UUID, session_id: uuid.UUID):
        session = db.scalars(
            sa.select(DefendSession)
            .where(
                DefendSession.id == session_id,
                DefendSession.project_id == project_id
            )
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
            
        session.status = "completed"
        
        answered_data = []
        skipped_count = 0
        for q in session.questions:
            if q.status == "skipped":
                skipped_count += 1
            elif q.attempts:
                latest = q.attempts[-1]
                answered_data.append({
                    "question": q.question_text,
                    "student_answer": latest.student_answer,
                    "ai_feedback": json.loads(latest.ai_feedback) if latest.ai_feedback and latest.ai_feedback.startswith("{") else latest.ai_feedback
                })
        
        try:
            llm = get_configured_ai_provider()
            recap_resp = llm.generate_session_recap(answered_data, skipped_count=skipped_count)
            recap_resp["answered_count"] = len(answered_data)
            recap_resp["skipped_count"] = skipped_count
            session.session_recap = json.dumps(recap_resp)
        except Exception:
            session.session_recap = json.dumps({
                "answered_count": len(answered_data),
                "skipped_count": skipped_count,
                "project_understanding": "An error occurred while generating the session recap. However, your answers were saved.",
                "flow_description": "N/A",
                "technical_clarity": "N/A",
                "relevant_specifics": "N/A",
                "evidence_support": "N/A",
                "next_step": "You can try generating a recap later."
            })
            
        db.commit()
        db.refresh(session)
        
        from app.services.analysis.orchestrator import ProjectAnalysisOrchestrator
        fingerprint = ProjectAnalysisOrchestrator._compute_input_fingerprint(db, project_id, session.analysis_run.snapshot_id)
        session.is_stale = (session.analysis_run.input_fingerprint != fingerprint)
        return session
