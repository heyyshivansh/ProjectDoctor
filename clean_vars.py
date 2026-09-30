import re

with open('frontend/src/components/desk/KeyFindingPager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()
code = re.sub(r'const prevFinding = [\s\S]*?;', '', code)
code = re.sub(r'const nextFinding = [\s\S]*?;', '', code)
with open('frontend/src/components/desk/KeyFindingPager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('frontend/src/pages/ReviewDeskPage.tsx', 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace('AlertCircle, CheckCircle2, FileText, Github, Loader2, Sparkles', 'AlertCircle, CheckCircle2, FileText, Github, Loader2')
with open('frontend/src/pages/ReviewDeskPage.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
