import {
  DocumentExtraction,
  DocumentExtractionSummary,
  BatchExtractionResponse,
} from "@/types/document";
import { ProjectUnderstanding } from "@/types/understanding";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function extractArtifact(
  projectId: string,
  artifactId: string
): Promise<DocumentExtraction> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/artifacts/${artifactId}/extraction`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to extract artifact: ${response.statusText}`
    );
  }

  return response.json();
}

export async function batchExtractDocuments(
  projectId: string
): Promise<BatchExtractionResponse> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/documents/extract`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to batch extract documents: ${response.statusText}`
    );
  }

  return response.json();
}

export async function listDocumentExtractions(
  projectId: string
): Promise<DocumentExtractionSummary[]> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/documents/extractions`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to list extractions: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getArtifactExtraction(
  projectId: string,
  artifactId: string
): Promise<DocumentExtraction> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/artifacts/${artifactId}/extraction`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to get extraction: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getExtractedText(
  projectId: string,
  artifactId: string
): Promise<string> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/artifacts/${artifactId}/extracted-text`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch extracted text: ${response.statusText}`
    );
  }

  return response.text();
}

export async function generateProjectUnderstanding(
  projectId: string
): Promise<ProjectUnderstanding> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/understanding`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to generate understanding: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getProjectUnderstanding(
  projectId: string
): Promise<ProjectUnderstanding | null> {
  const response = await fetch(
    `${API_BASE}/api/projects/${projectId}/understanding`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Failed to fetch project understanding: ${response.statusText}`
    );
  }

  return response.json();
}
