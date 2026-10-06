import re
content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()
# Find the first def test_defend_session_complete_recap and truncate there
idx = content.find("def test_defend_session_complete_recap")
if idx != -1:
    content = content[:idx]

new_tests = """def test_defend_session_complete_recap(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: test_analysis_run.input_fingerprint)
    
    # ensure no active sessions to avoid 409
    db_session.execute(sa.text("DELETE FROM defend_sessions"))
    db_session.commit()
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]
    q_id = resp.json()["session"]["questions"][0]["id"]
    
    client.post(f"/api/projects/{project.id}/defend/questions/{q_id}/attempts", json={"student_answer": "I did this"})
    
    from app.services.ai.mock_provider import MockAIProvider
    class MockRecapProvider(MockAIProvider):
        def generate_session_recap(self, answered_data):
            return {"recap": "Good job on the recap!"}
    
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: MockRecapProvider())
    
    comp = client.post(f"/api/projects/{project.id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert data["status"] == "completed"
    assert data["session_recap"] == "Good job on the recap!"

def test_defend_session_complete_unanswered(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: test_analysis_run.input_fingerprint)
    
    db_session.execute(sa.text("DELETE FROM defend_sessions"))
    db_session.commit()
    
    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]
    
    comp = client.post(f"/api/projects/{project.id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert "did not answer any questions" in data["session_recap"]
"""

content += new_tests

# also fix FakeAIProvider schema everywhere
old_schema_regex = r'\{"student_explanation": (.*?), "cited_evidence": (.*?), "remaining_uncertainty": (.*?), "next_step": (.*?)\}'
new_schema = r'{"what_explained_clearly": \1, "flow_description": \1, "technical_specificity": \1, "evidence_support": \3, "cited_evidence": \2, "next_step": \4}'
content = re.sub(old_schema_regex, new_schema, content)

open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
