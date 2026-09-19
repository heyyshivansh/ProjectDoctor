import {
  RequirementTraceabilitySummary,
  RequirementTraceabilityDetail,
  TraceabilityMetrics,
  TraceabilityGenerationResult,
} from "@/types/traceability";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function generateTraceability(
  projectId: string,
  force: boolean = false,
  snapshotId?: string
): Promise<TraceabilityGenerationResult> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/traceability/generate`);
  if (force) url.searchParams.set("force", "true");
  if (snapshotId) url.searchParams.set("snapshot_id", snapshotId);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to generate traceability: ${response.statusText}`
    );
  }

  return response.json();
}

export async function listProjectTraceability(
  projectId: string,
  filters?: {
    status?: string;
    search?: string;
    snapshotId?: string;
  }
): Promise<RequirementTraceabilitySummary[]> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/traceability`);

  if (filters?.status) url.searchParams.set("status", filters.status);
  if (filters?.search) url.searchParams.set("search", filters.search);
  if (filters?.snapshotId) url.searchParams.set("snapshot_id", filters.snapshotId);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch project traceability: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getTraceabilitySummary(
  projectId: string,
  snapshotId?: string
): Promise<TraceabilityMetrics> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/traceability/summary`);
  if (snapshotId) url.searchParams.set("snapshot_id", snapshotId);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch traceability metrics: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getRequirementTraceability(
  projectId: string,
  requirementId: string,
  snapshotId?: string
): Promise<RequirementTraceabilityDetail> {
  const url = new URL(
    `${API_BASE}/api/projects/${projectId}/traceability/${requirementId}`
  );
  if (snapshotId) url.searchParams.set("snapshot_id", snapshotId);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch requirement traceability detail: ${response.statusText}`
    );
  }

  return response.json();
}
