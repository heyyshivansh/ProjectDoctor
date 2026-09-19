import {
  ProjectDiagnosis,
  DiagnosisGenerationResult,
  FindingSummary,
  FindingDetail,
} from "@/types/diagnosis";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Fetch current project diagnosis (strictly read-only GET).
 */
export async function getProjectDiagnosis(
  projectId: string,
  snapshotId?: string
): Promise<ProjectDiagnosis> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/diagnosis`);
  if (snapshotId) {
    url.searchParams.set("snapshot_id", snapshotId);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch project diagnosis: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Explicitly generate or re-evaluate project diagnosis (POST).
 */
export async function generateProjectDiagnosis(
  projectId: string,
  force: boolean = false,
  snapshotId?: string
): Promise<DiagnosisGenerationResult> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/diagnosis/generate`);
  if (force) {
    url.searchParams.set("force", "true");
  }
  if (snapshotId) {
    url.searchParams.set("snapshot_id", snapshotId);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to generate diagnosis: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * List findings for a project with optional severity or snapshot filters.
 */
export async function listProjectFindings(
  projectId: string,
  filters?: {
    severity?: string;
    finding_type?: string;
    snapshotId?: string;
    limit?: number;
    offset?: number;
  }
): Promise<FindingSummary[]> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/findings`);
  if (filters?.severity) {
    url.searchParams.set("severity", filters.severity);
  }
  if (filters?.finding_type) {
    url.searchParams.set("finding_type", filters.finding_type);
  }
  if (filters?.snapshotId) {
    url.searchParams.set("snapshot_id", filters.snapshotId);
  }
  if (filters?.limit) {
    url.searchParams.set("limit", String(filters.limit));
  }
  if (filters?.offset) {
    url.searchParams.set("offset", String(filters.offset));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to list findings: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetch detailed finding with hydrated canonical evidence (read-only GET).
 */
export async function getFindingDetail(
  projectId: string,
  findingId: string
): Promise<FindingDetail> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/findings/${findingId}`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch finding detail: ${response.statusText}`
    );
  }

  return response.json();
}
