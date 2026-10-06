import re
import json

content = open('backend/app/services/defend/defend_service.py', encoding='utf-8').read()

skip_method = """
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
"""

if 'def skip_question' not in content:
    content = content.replace('    @staticmethod\n    def retry_attempt_feedback', skip_method.strip('\n') + '\n\n    @staticmethod\n    def retry_attempt_feedback')

complete_session_pattern = re.compile(r'    @staticmethod\n    def complete_session.*?return session', re.DOTALL)

complete_session_code = """    @staticmethod
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
        return session"""

content = complete_session_pattern.sub(complete_session_code, content)
open('backend/app/services/defend/defend_service.py', 'w', encoding='utf-8').write(content)
