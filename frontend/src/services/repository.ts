import {
  RepositoryConnection,
  RepositoryConnectInput,
  RepositorySyncResult,
  RepositoryFile,
  RepositoryEvidence,
} from "@/types/repository";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function connectRepository(
  projectId: string,
  input: RepositoryConnectInput
): Promise<RepositoryConnection> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/repository`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to connect repository: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getRepository(
  projectId: string
): Promise<RepositoryConnection | null> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/repository`, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch repository: ${response.statusText}`
    );
  }

  return response.json();
}

export async function syncRepository(
  projectId: string,
  force: boolean = false
): Promise<RepositorySyncResult> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/repository/sync`);
  if (force) {
    url.searchParams.set("force", "true");
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to sync repository: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getRepositoryTree(
  projectId: string,
  filters?: {
    path_prefix?: string;
    extension?: string;
    include_ignored?: boolean;
  }
): Promise<RepositoryFile[]> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/repository/tree`);
  if (filters?.path_prefix) url.searchParams.set("path_prefix", filters.path_prefix);
  if (filters?.extension) url.searchParams.set("extension", filters.extension);
  if (filters?.include_ignored !== undefined)
    url.searchParams.set("include_ignored", String(filters.include_ignored));

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch repository tree: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getRepositoryEvidence(
  projectId: string,
  evidenceType?: string
): Promise<RepositoryEvidence[]> {
  const url = new URL(`${API_BASE}/api/projects/${projectId}/repository/evidence`);
  if (evidenceType && evidenceType !== "all") {
    url.searchParams.set("evidence_type", evidenceType);
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch repository evidence: ${response.statusText}`
    );
  }

  return response.json();
}

export async function disconnectRepository(
  projectId: string
): Promise<{ status: string; project_id: string }> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/repository`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to disconnect repository: ${response.statusText}`
    );
  }

  return response.json();
}
