import re
content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()

def replace_between(start_str, end_str, new_str, text):
    start = text.find(start_str)
    end = text.find(end_str, start) + len(end_str)
    return text[:start] + new_str + text[end:]

new_tests = """def test_defend_session_complete_recap(client, db_session, project_with_analysis, monkeypatch):
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: project_with_analysis[1].input_fingerprint)
    from app.services.ai.mock_provider import MockAIProvider
    
    # ensure no active sessions to avoid 409
    db_session.execute(sa.text("DELETE FROM defend_sessions"))
    db_session.commit()
    
    resp = client.post(f"/api/projects/{project_with_analysis[0].id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]
    q_id = resp.json()["session"]["questions"][0]["id"]
    
    client.post(f"/api/projects/{project_with_analysis[0].id}/defend/questions/{q_id}/attempts", json={"student_answer": "I did this"})
    
    class MockRecapProvider(MockAIProvider):
        def generate_session_recap(self, answered_data):
            return {"recap": "Good job on the recap!"}
    
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: MockRecapProvider())
    
    comp = client.post(f"/api/projects/{project_with_analysis[0].id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert data["status"] == "completed"
    assert data["session_recap"] == "Good job on the recap!"

def test_defend_session_complete_unanswered(client, db_session, project_with_analysis, monkeypatch):
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: project_with_analysis[1].input_fingerprint)
    
    db_session.execute(sa.text("DELETE FROM defend_sessions"))
    db_session.commit()
    
    resp = client.post(f"/api/projects/{project_with_analysis[0].id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]
    
    comp = client.post(f"/api/projects/{project_with_analysis[0].id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert "did not answer any questions" in data["session_recap"]
"""

content = replace_between("def test_defend_session_complete_recap", 'assert "did not answer any questions" in data["session_recap"]', new_tests, content)
open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
