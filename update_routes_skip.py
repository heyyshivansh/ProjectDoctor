import re

content = open('backend/app/api/routes/defend.py', encoding='utf-8').read()

skip_route = """@router.post(
    "/{project_id}/defend/questions/{question_id}/skip",
    response_model=DefendQuestionResponse,
    summary="Skip a Defend Question",
)
def skip_defend_question(
    project_id: uuid.UUID,
    question_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    \"\"\"
    Skip a Defend Question.
    \"\"\"
    return DefendService.skip_question(db=db, project_id=project_id, question_id=question_id)
"""

if 'def skip_defend_question' not in content:
    content = content.replace('def retry_defend_attempt_feedback', skip_route + '\n\n@router.post(\n    "/{project_id}/defend/attempts/{attempt_id}/retry",\n    response_model=DefendAttemptResponse,\n    summary="Retry generating AI feedback for a Defend attempt",\n)\ndef retry_defend_attempt_feedback')
    content = content.replace('DefendSessionCreateResponse,', 'DefendSessionCreateResponse,\n    DefendQuestionResponse,')
    open('backend/app/api/routes/defend.py', 'w', encoding='utf-8').write(content)
