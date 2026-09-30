import re

with open('backend/app/services/analysis/orchestrator.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Find the loop constructing completed_stages
loop_regex = re.compile(r'(\s+)completed_stages = \[\]\s+for stage_code, label, desc in STAGE_DEFINITIONS:\s+completed_stages\.append\(\s+AnalysisStageInfo\(\s+stage=stage_code,\s+label=label,\s+description=desc,\s+status="completed",\s+detail=stage_details_map\.get\(stage_code, "Evaluated"\),\s+\)\s+\)', re.DOTALL)

new_loop = '''\\1completed_stages = []
\\1for stage_code, label, desc in STAGE_DEFINITIONS:
\\1    status_val = "completed"
\\1    if stage_code == STAGE_AI_REVIEW and ai_status:
\\1        status_val = ai_status
\\1    completed_stages.append(
\\1        AnalysisStageInfo(
\\1            stage=stage_code,
\\1            label=label,
\\1            description=desc,
\\1            status=status_val,
\\1            detail=stage_details_map.get(stage_code, "Evaluated"),
\\1        )
\\1    )'''

code = loop_regex.sub(new_loop, code)

with open('backend/app/services/analysis/orchestrator.py', 'w', encoding='utf-8') as f:
    f.write(code)
