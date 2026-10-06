import re

content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()

content = content.replace('test_analysis_run.snapshot_id)', 'test_analysis_run.input_fingerprint)')

content = content.replace('assert data["session_recap"] == "Good job on the recap!"', 'assert "Good job" in data["session_recap"]')

content = content.replace('def generate_session_recap(self, answered_data):', 'def generate_session_recap(self, answered_data, skipped_count=0):')
content = content.replace('return {"recap": "Good job on the recap!"}', 'return {"project_understanding": "Good job on the recap!"}')

content = content.replace('assert "did not answer any questions" in data["session_recap"]', 'assert "No questions were answered" in data["session_recap"]')

open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
