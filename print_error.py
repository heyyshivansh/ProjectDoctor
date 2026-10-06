import re
content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()
content = content.replace('session_id = resp.json()["session"]["id"]', 'assert "session" in resp.json(), resp.json()\n            session_id = resp.json()["session"]["id"]')
open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
