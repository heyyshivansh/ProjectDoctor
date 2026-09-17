import {
  Project,
  ProjectCreateInput,
  ProjectDetail,
  ProjectListResponse,
  Artifact,
} from "@/types/project";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Helper to handle fetch errors cleanly.
 */
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
      // JSON parse error fallback
    }
    throw new Error(errorDetail);
  }
  return (await response.json()) as T;
}

/**
 * Create a new technical project.
 */
export async function createProject(data: ProjectCreateInput): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

/**
 * Fetch paginated list of projects.
 */
export async function getProjects(
  skip: number = 0,
  limit: number = 20
): Promise<ProjectListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/projects?skip=${skip}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );
  return handleResponse<ProjectListResponse>(response);
}

/**
 * Retrieve a project by UUID with its attached artifacts.
 */
export async function getProject(projectId: string): Promise<ProjectDetail> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return handleResponse<ProjectDetail>(response);
}

/**
 * Upload an artifact file for a project.
 */
export async function uploadArtifact(
  projectId: string,
  file: File,
  fileType: string = "other"
): Promise<Artifact> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file_type", fileType);

  const response = await fetch(
    `${API_BASE_URL}/api/projects/${projectId}/artifacts`,
    {
      method: "POST",
      body: formData,
    }
  );
  return handleResponse<Artifact>(response);
}

/**
 * Get direct download URL for an artifact.
 */
export function getArtifactDownloadUrl(
  projectId: string,
  artifactId: string
): string {
  return `${API_BASE_URL}/api/projects/${projectId}/artifacts/${artifactId}/download`;
}
