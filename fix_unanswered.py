import re

content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()

patch_code = """
    from app.services.ai.mock_provider import MockAIProvider
    class MockRecapProvider(MockAIProvider):
        def generate_session_recap(self, answered_data, skipped_count=0):
            return {"project_understanding": "No questions were answered."}
    monkeypatch.setattr("app.services.defend.defend_service.get_configured_ai_provider", lambda: MockRecapProvider())
"""

if 'MockRecapProvider' not in content.split('def test_defend_session_complete_unanswered')[1]:
    content = content.replace('    resp = client.post(f"/api/projects/{project.id}/defend/sessions")', patch_code + '\n    resp = client.post(f"/api/projects/{project.id}/defend/sessions")')
    
    open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
