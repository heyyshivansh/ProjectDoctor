import re
lines = open('backend/tests/test_defend_api.py', encoding='utf-8').read().split('\n')
lines[583] = '    session_id = resp.json()["session"]["id"]'
lines[584] = ''
open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write('\n'.join(lines))
