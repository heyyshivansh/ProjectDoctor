export interface TeamMember {
  name: string;
  role?: string | null;
}

export interface ProvenanceRecord {
  source_type: "project_metadata" | "artifact";
  field?: string;
  artifact_id?: string;
  section?: string;
  value?: string;
}

export interface ProjectUnderstanding {
  id: string;
  project_id: string;
  status: "pending" | "completed" | "failed";
  problem?: string | null;
  target_users: string[];
  objectives: string[];
  requirements_summary?: string | null;
  modules: string[];
  tech_stack: string[];
  architecture_overview?: string | null;
  dependencies: string[];
  expected_scale?: string | null;
  deployment?: string | null;
  team: TeamMember[];
  provenance: Record<string, any>;
  source_artifact_ids: string[];
  extracted_sections_count: number;
  total_words_analyzed: number;
  created_at: string;
  updated_at: string;
}
