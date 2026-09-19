export type FindingSeverity =
  | "critical"
  | "major"
  | "needs_attention"
  | "improvement"
  | "strength";

export type DiagnosisStatus =
  | "looks_solid"
  | "needs_attention"
  | "significant_concern"
  | "not_enough_evidence_yet"
  | "not_analyzed";

export interface FindingEvidenceReference {
  target_type: "requirement" | "traceability" | "repository_file" | "repository_evidence" | "artifact" | string;
  target_id: string;
  role?: string | null;
}

export interface HydratedEvidenceItem {
  target_type: string;
  target_id: string;
  role?: string | null;
  title?: string | null;
  file_path?: string | null;
  snippet?: string | null;
  page_number?: number | null;
  section_title?: string | null;
  evidence_type?: string | null;
  match_confidence?: number | null;
  line_start?: number | null;
  line_end?: number | null;
}

export interface FindingSummary {
  id: string;
  project_id: string;
  snapshot_id?: string | null;
  commit_sha?: string | null;
  finding_type: string;
  severity: FindingSeverity;
  title: string;
  summary: string;
  why_it_matters: string;
  suggested_action?: string | null;
  finding_hash: string;
  created_at: string;
  updated_at: string;
}

export interface FindingDetail {
  id: string;
  project_id: string;
  snapshot_id?: string | null;
  commit_sha?: string | null;
  finding_type: string;
  severity: FindingSeverity;
  title: string;
  summary: string;
  why_it_matters: string;
  suggested_action?: string | null;
  evidence_references: FindingEvidenceReference[];
  hydrated_evidence: HydratedEvidenceItem[];
  technical_details: Record<string, any>;
  finding_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDiagnosis {
  project_id: string;
  project_title: string;
  status: DiagnosisStatus;
  status_label: string;
  summary: string;
  snapshot_id?: string | null;
  commit_sha?: string | null;
  analyzed_at?: string | null;
  total_findings: number;
  critical_count: number;
  major_count: number;
  needs_attention_count: number;
  improvements_count: number;
  strengths_count: number;
  top_findings: FindingSummary[];
  strengths: FindingSummary[];
}

export interface DiagnosisGenerationResult {
  status: string;
  message: string;
  diagnosis: ProjectDiagnosis;
}
