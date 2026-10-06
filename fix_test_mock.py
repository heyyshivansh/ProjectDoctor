import re
content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()

patch_code = "    monkeypatch.setattr('app.services.analysis.orchestrator.ProjectAnalysisOrchestrator._compute_input_fingerprint', lambda *args: project_with_analysis[1].input_fingerprint)\n"

# In test_defend_session_complete_recap
content = content.replace(
    'def test_defend_session_complete_recap(client, db_session, project_with_analysis, monkeypatch):\n    from app.services.ai.mock_provider import MockAIProvider',
    'def test_defend_session_complete_recap(client, db_session, project_with_analysis, monkeypatch):\n' + patch_code + '    from app.services.ai.mock_provider import MockAIProvider'
)

# In test_defend_session_complete_unanswered
content = content.replace(
    'def test_defend_session_complete_unanswered(client, db_session, project_with_analysis, monkeypatch):\n    resp = client.post(',
    'def test_defend_session_complete_unanswered(client, db_session, project_with_analysis, monkeypatch):\n' + patch_code + '    resp = client.post('
)

open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
