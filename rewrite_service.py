import re

content = open("backend/app/services/defend/defend_service.py").read()

new_logic = """        # Create new session since we know there is evidence
        session = DefendSession(
            project_id=project_id,
            analysis_run_id=latest_run.id,
            status="active"
        )
        db.add(session)
        db.flush()

        from app.services.ai.factory import get_configured_ai_provider
        import logging
        logger = logging.getLogger(__name__)

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

        db.commit()"""

# We'll replace the block from `# Create new session since we know there is evidence` down to `db.commit()`
start_idx = content.find("        # Create new session since we know there is evidence")
end_idx = content.find("        db.commit()") + len("        db.commit()")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_logic + content[end_idx:]
    open("backend/app/services/defend/defend_service.py", "w").write(content)
