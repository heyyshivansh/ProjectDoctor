import re
lines = open('frontend/src/services/defend.ts', encoding='utf-8').read().split('\n')
new_fn = """export async function completeDefendSession(projectId: string, sessionId: string): Promise<DefendSession> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/defend/sessions/${sessionId}/complete`, {
    method: "POST",
    headers: { Accept: "application/json" }
  });
  return handleResponse(response);
}
"""
lines.append(new_fn)
for i, line in enumerate(lines):
    if 'questions: DefendQuestion[];' in line:
        lines.insert(i, '  session_recap?: string;')
        break
open('frontend/src/services/defend.ts', 'w', encoding='utf-8').write('\n'.join(lines))
