export type AnalysisStatus =
  | "not_started"
  | "running"
  | "completed"
  | "interrupted"
  | "failed"
  | "stale"
  | "insufficient_evidence";

export type AnalysisStageCode =
  | "STAGE_DOCUMENTS"
  | "STAGE_UNDERSTANDING"
  | "STAGE_REQUIREMENTS"
  | "STAGE_REPOSITORY"
  | "STAGE_TRACEABILITY"
  | "STAGE_DIAGNOSIS"
  | "STAGE_AI_REVIEW";

export type StageProgressStatus = "pending" | "active" | "completed" | "failed" | "skipped";

export interface AnalysisStageInfo {
  stage: AnalysisStageCode | string;
  label: string;
  description: string;
  status: StageProgressStatus;
  detail?: string | null;
}

export interface AnalysisStatusResponse {
  project_id: string;
  project_title: string;
  status: AnalysisStatus;
  current_stage?: string | null;
  current_stage_label?: string | null;
  stages: AnalysisStageInfo[];
  is_stale: boolean;
  stale_reason?: string | null;
  critical_count: number;
  needs_attention_count: number;
  strengths_count: number;
  analyzed_at?: string | null;
  commit_sha?: string | null;
  message?: string | null;
  ai_status?: "completed" | "unavailable" | "skipped" | null;
}

export interface AnalysisTriggerRequest {
  force?: boolean;
}
