import re
lines = open('backend/app/services/defend/defend_service.py', encoding='utf-8').read().split('\n')
new_method = """    @staticmethod
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
        
        # Build prompt for recap based on answered questions
        answered_data = []
        for q in session.questions:
            if q.attempts:
                latest = q.attempts[-1]
                answered_data.append({
                    "question": q.question_text,
                    "student_answer": latest.student_answer,
                    "ai_feedback": json.loads(latest.ai_feedback) if latest.ai_feedback and latest.ai_feedback.startswith("{") else latest.ai_feedback
                })
        
        if answered_data:
            try:
                llm = get_configured_ai_provider()
                # In base.py we will add generate_session_recap
                recap_resp = llm.generate_session_recap(answered_data)
                session.session_recap = recap_resp.get("recap")
            except Exception:
                session.session_recap = "An error occurred while generating the session recap. However, your answers were saved."
        else:
            session.session_recap = "You did not answer any questions in this practice session."
            
        db.commit()
        db.refresh(session)
        
        # We need to compute is_stale for response
        fingerprint = ProjectAnalysisOrchestrator._compute_input_fingerprint(session.project)
        session.is_stale = (session.analysis_run.input_fingerprint != fingerprint)
        return session
"""
open('backend/app/services/defend/defend_service.py', 'w', encoding='utf-8').write('\n'.join(lines) + '\n' + new_method)
