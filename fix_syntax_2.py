import re

with open('frontend/src/pages/ReviewDeskPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('\ files', '\\ files\')

with open('frontend/src/pages/ReviewDeskPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
