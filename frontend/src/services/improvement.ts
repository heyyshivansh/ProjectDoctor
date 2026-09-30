import { ImprovementPlan, ImprovementItem } from "../types/improvement";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.detail) {
        errorDetail = errData.detail;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    // We throw an object that looks like Axios error for compatibility with catch blocks
    throw { response: { data: { detail: errorDetail } }, message: errorDetail };
  }
  return response.json();
}

export const getImprovementPlan = async (projectId: string): Promise<ImprovementPlan> => {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/improvement-plan`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });
  return handleResponse<ImprovementPlan>(response);
};

export const updateImprovementItemStatus = async (
  projectId: string,
  itemId: string,
  status: "not_started" | "in_progress" | "completed"
): Promise<ImprovementItem> => {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/improvement-plan/items/${itemId}`, {
    method: "PATCH",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse<ImprovementItem>(response);
};
