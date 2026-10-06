import re
new_test_code = """
def test_defend_session_complete_recap(client, db_session, project_with_analysis, monkeypatch):
    from app.services.ai.mock_provider import MockAIProvider
    
    # Create session
    resp = client.post(f"/api/projects/{project_with_analysis.id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]
    
    # Submit answer
    q_id = resp.json()["session"]["questions"][0]["id"]
    client.post(f"/api/projects/{project_with_analysis.id}/defend/questions/{q_id}/attempts", json={"student_answer": "I did this"})
    
    # Mock the recap generator
    class MockRecapProvider(MockAIProvider):
        def generate_session_recap(self, answered_data):
            return {"recap": "Good job on the recap!"}
    
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: MockRecapProvider())
    
    # Complete
    comp = client.post(f"/api/projects/{project_with_analysis.id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert data["status"] == "completed"
    assert data["session_recap"] == "Good job on the recap!"

def test_defend_session_complete_unanswered(client, db_session, project_with_analysis, monkeypatch):
    resp = client.post(f"/api/projects/{project_with_analysis.id}/defend/sessions")
    session_id = resp.json()["session"]["id"]
    
    # Complete directly without answers
    comp = client.post(f"/api/projects/{project_with_analysis.id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert "did not answer any questions" in data["session_recap"]
"""
open('backend/tests/test_defend_api.py', 'a', encoding='utf-8').write(new_test_code)
