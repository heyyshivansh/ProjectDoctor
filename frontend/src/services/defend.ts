const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.detail) {
        if (typeof errData.detail === "string") {
          errorDetail = errData.detail;
        } else if (Array.isArray(errData.detail)) {
          errorDetail = errData.detail.map((d: { msg?: string }) => d.msg || "").join(", ");
        }
      }
    } catch {
      // json parse err
    }
    throw new Error(errorDetail);
  }
  return (await response.json()) as T;
}

export interface DefendAttempt {
  id: string;
  question_id: string;
  student_answer: string;
  ai_feedback?: string;
  created_at: string;
}

export interface DefendQuestion {
  id: string;
  session_id: string;
  question_text: string;
  evidence_type: string;
  evidence_id: string;
  evidence_context: string;
  status: string;
  created_at: string;
  attempts: DefendAttempt[];
}

export interface DefendSession {
  id: string;
  project_id: string;
  analysis_run_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  session_recap?: string;
  questions: DefendQuestion[];
}

export async function startDefendSession(projectId: string): Promise<{ session: DefendSession, message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/defend/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" }
  });
  return handleResponse(response);
}

export async function getDefendSession(projectId: string, sessionId: string): Promise<DefendSession> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/defend/sessions/${sessionId}`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  return handleResponse(response);
}

export async function submitDefendAttempt(projectId: string, questionId: string, answer: string): Promise<DefendAttempt> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/defend/questions/${questionId}/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ student_answer: answer })
  });
  return handleResponse(response);
}

export async function retryDefendAttemptFeedback(projectId: string, attemptId: string): Promise<DefendAttempt> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/defend/attempts/${attemptId}/retry`, {
    method: "POST",
    headers: { Accept: "application/json" }
  });
  return handleResponse(response);
}

export async function completeDefendSession(projectId: string, sessionId: string): Promise<DefendSession> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/defend/sessions/${sessionId}/complete`, {
    method: "POST",
    headers: { Accept: "application/json" }
  });
  return handleResponse(response);
}

export async function skipDefendQuestion(projectId: string, questionId: string): Promise<DefendQuestion> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/defend/questions/${questionId}/skip`, {
    method: "POST",
    headers: { Accept: "application/json" }
  });
  return handleResponse(response);
}
