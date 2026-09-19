import { RequirementEvidence } from "@/types/requirement";

export type TraceabilityStatus = "unmatched" | "candidate" | "candidate_with_tests" | "ambiguous";

export interface TraceabilityLink {
  id: string;
  traceability_id: string;
  requirement_id: string;
  snapshot_id: string;
  commit_sha: string;
  file_path: string;
  evidence_type: string;
  is_test_evidence: boolean;
  match_confidence: number;
  match_level: string;
  match_rationale: string;
  line_start?: number | null;
  line_end?: number | null;
  code_snippet?: string | null;
  github_url?: string | null;
  created_at: string;
}

export interface RequirementTraceabilitySummary {
  id: string;
  project_id: string;
  requirement_id: string;
  requirement_code: string;
  title: string;
  description: string;
  category: string;
  priority?: string | null;
  actor?: string | null;
  snapshot_id: string;
  commit_sha: string;
  status: TraceabilityStatus;
  implementation_count: number;
  test_count: number;
  summary_notes?: string | null;
  candidate_files: string[];
  test_files: string[];
  specification_evidence_count: number;
  created_at: string;
  updated_at: string;
}

export interface RequirementTraceabilityDetail {
  id: string;
  project_id: string;
  requirement_id: string;
  requirement_code: string;
  title: string;
  description: string;
  category: string;
  priority?: string | null;
  actor?: string | null;
  is_ambiguous_specification: boolean;
  conflict_summary?: string | null;
  snapshot_id?: string | null;
  commit_sha?: string | null;
  status: TraceabilityStatus;
  implementation_count: number;
  test_count: number;
  summary_notes?: string | null;
  specification_evidence: RequirementEvidence[];
  implementation_links: TraceabilityLink[];
  test_links: TraceabilityLink[];
  verification_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TraceabilityMetrics {
  project_id: string;
  snapshot_id?: string | null;
  commit_sha?: string | null;
  has_repository: boolean;
  total_requirements: number;
  candidate_with_tests_count: number;
  candidate_count: number;
  unmatched_count: number;
  ambiguous_count: number;
  coverage_percentage: number;
}

export interface TraceabilityGenerationResult {
  status: string;
  message: string;
  snapshot_id: string;
  commit_sha: string;
  total_requirements: number;
  generated_links_count: number;
  metrics: TraceabilityMetrics;
}
