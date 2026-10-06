import re
lines = open('backend/app/api/routes/defend.py', encoding='utf-8').read().split('\n')
new_route = """@router.post(
    "/{project_id}/defend/sessions/{session_id}/complete",
    response_model=DefendSessionResponse,
    summary="Complete a Defend session and generate a recap",
)
def complete_defend_session(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    \"\"\"
    Complete the Defend session and generate an end-of-session recap based on answers.
    \"\"\"
    return DefendService.complete_session(
        db=db, project_id=project_id, session_id=session_id
    )
"""
open('backend/app/api/routes/defend.py', 'w', encoding='utf-8').write('\n'.join(lines) + '\n' + new_route)
