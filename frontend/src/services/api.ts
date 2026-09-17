export interface HealthStatus {
  status: "ok" | string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Fetch health status from the backend API.
 * Gracefully returns null if backend is unreachable or returns non-200.
 */
export async function getBackendHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as HealthStatus;
    return data;
  } catch {
    return null;
  }
}
