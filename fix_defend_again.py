import re

content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()

patch_code = """
    from app.services.ai.mock_provider import MockAIProvider
    class MockRecapProvider(MockAIProvider):
        def generate_session_recap(self, answered_data, skipped_count=0):
            return {"project_understanding": "No questions were answered."}
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: MockRecapProvider())
"""

content = content.replace(patch_code + '\n    resp = client.post(f"/api/projects/{project.id}/defend/sessions")', '    resp = client.post(f"/api/projects/{project.id}/defend/sessions")')

# Apply it ONLY to test_defend_session_complete_unanswered
defend_unanswered = """def test_defend_session_complete_unanswered(client: TestClient, db_session: Session, project_with_analysis, monkeypatch):
    project, test_analysis_run = project_with_analysis
    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: test_analysis_run.input_fingerprint)

    from app.models.finding import Finding
    f = Finding(project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture", severity="needs_attention", title="Test finding", summary="Test summary", why_it_matters="Test reason", finding_hash="hash123")
    db_session.add(f)
    db_session.commit()
    db_session.execute(sa.text("DELETE FROM defend_sessions"))
    db_session.commit()

    from app.services.ai.mock_provider import MockAIProvider
    class MockRecapProvider(MockAIProvider):
        def generate_session_recap(self, answered_data, skipped_count=0):
            return {"project_understanding": "No questions were answered."}
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: MockRecapProvider())

    resp = client.post(f"/api/projects/{project.id}/defend/sessions")
    assert resp.status_code == 200
    session_id = resp.json()["session"]["id"]

    comp = client.post(f"/api/projects/{project.id}/defend/sessions/{session_id}/complete")
    assert comp.status_code == 200
    data = comp.json()
    assert "No questions were answered" in data["session_recap"]
"""

pattern = re.compile(r'def test_defend_session_complete_unanswered\(.*?\n        assert "No questions were answered" in data\["session_recap"\]\n', re.DOTALL)
content = pattern.sub(defend_unanswered.replace('\n', '\n    ').replace('    def test_', 'def test_'), content)

open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
