import re
content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()
content = "import sqlalchemy as sa\nfrom app.models.defend import DefendSession, DefendQuestion\n" + content
open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
