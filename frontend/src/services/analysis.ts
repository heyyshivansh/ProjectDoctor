import { AnalysisStatusResponse } from "@/types/analysis";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Fetch current project evaluation status (strictly read-only GET).
 */
export async function getProjectAnalysisStatus(
  projectId: string
): Promise<AnalysisStatusResponse> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/analysis-status`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch analysis status: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Trigger asynchronous project evaluation pipeline (POST 202).
 */
export async function triggerProjectAnalysis(
  projectId: string,
  force: boolean = false
): Promise<AnalysisStatusResponse> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/analyze`);
  if (force) {
    url.searchParams.set("force", "true");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ force }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to trigger analysis: ${response.statusText}`
    );
  }

  return response.json();
}
