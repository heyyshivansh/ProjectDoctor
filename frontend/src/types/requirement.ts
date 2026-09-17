export interface RequirementEvidence {
  id: string;
  requirement_id: string;
  project_id: string;
  artifact_id: string | null;
  source_type: "artifact" | "project_metadata" | string;
  artifact_name: string | null;
  page_number: number | null;
  section_title: string | null;
  exact_snippet: string;
  extraction_method: string;
  confidence: number;
  created_at: string;
}

export interface Requirement {
  id: string;
  project_id: string;
  requirement_id: string;
  title: string;
  description: string;
  category: "functional" | "non_functional" | "security" | "performance" | "interface" | "general" | string;
  priority: string | null;
  actor: string | null;
  status: "extracted" | "conflicted" | "ambiguous" | "deprecated" | string;
  is_ambiguous: boolean;
  conflict_summary: string | null;
  content_hash: string;
  evidence_count: number;
  created_at: string;
  updated_at: string;
}

export interface RequirementDetail extends Requirement {
  evidence: RequirementEvidence[];
}

export interface RequirementExtractionSummary {
  total_extracted: number;
  functional_count: number;
  non_functional_count: number;
  security_count: number;
  ambiguous_count: number;
  conflicted_count: number;
  requirements: Requirement[];
}

export interface RequirementMetrics {
  total: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
  ambiguous_count: number;
  conflict_count: number;
}
