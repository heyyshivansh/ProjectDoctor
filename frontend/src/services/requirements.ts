import {
  Requirement,
  RequirementDetail,
  RequirementExtractionSummary,
  RequirementMetrics,
} from "@/types/requirement";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function extractRequirements(
  projectId: string,
  forceRegenerate: boolean = false
): Promise<RequirementExtractionSummary> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/requirements/extract`);
  if (forceRegenerate) {
    url.searchParams.set("force_regenerate", "true");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to extract requirements: ${response.statusText}`
    );
  }

  return response.json();
}

export async function listRequirements(
  projectId: string,
  filters?: {
    category?: string;
    status?: string;
    is_ambiguous?: boolean;
    search?: string;
  }
): Promise<Requirement[]> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/requirements`);

  if (filters?.category) url.searchParams.set("category", filters.category);
  if (filters?.status) url.searchParams.set("status", filters.status);
  if (filters?.is_ambiguous !== undefined)
    url.searchParams.set("is_ambiguous", String(filters.is_ambiguous));
  if (filters?.search) url.searchParams.set("search", filters.search);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to list requirements: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getRequirement(
  projectId: string,
  requirementId: string
): Promise<RequirementDetail> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/requirements/${requirementId}`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch requirement: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getRequirementMetrics(
  projectId: string
): Promise<RequirementMetrics> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/requirements/summary`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch requirement metrics: ${response.statusText}`
    );
  }

  return response.json();
}
