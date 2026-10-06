import re
content = open('backend/tests/test_defend_api.py', encoding='utf-8').read()

content = content.replace('project_with_analysis.id', 'project_with_analysis[0].id')

old_schema_regex = r'\{"student_explanation": (.*?), "cited_evidence": (.*?), "remaining_uncertainty": (.*?), "next_step": (.*?)\}'
new_schema = r'{"what_explained_clearly": \1, "flow_description": \1, "technical_specificity": \1, "evidence_support": \3, "cited_evidence": \2, "next_step": \4}'
content = re.sub(old_schema_regex, new_schema, content)

open('backend/tests/test_defend_api.py', 'w', encoding='utf-8').write(content)
