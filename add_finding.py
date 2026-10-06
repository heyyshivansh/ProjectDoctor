import re
content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()

f_code = """    from app.models.finding import Finding
    f = Finding(project_id=project.id, snapshot_id=test_analysis_run.snapshot_id, finding_type="architecture", severity="needs_attention", title="Test finding", summary="Test summary", why_it_matters="Test reason", finding_hash="hash123")
    db_session.add(f)
    db_session.commit()
    db_session.execute(sa.text("DELETE FROM defend_sessions"))"""

content = content.replace('    db_session.execute(sa.text("DELETE FROM defend_sessions"))', f_code)
open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
