export interface ImprovementItem {
  id: string;
  project_id: string;
  original_run_id: string | null;
  latest_verification_run_id: string | null;
  finding_id: string | null;
  
  status: 'not_started' | 'in_progress' | 'completed';
  verification_status: 'unverified' | 'still_detected' | 'no_longer_detected' | 'verified_resolved' | 'needs_review';
  verification_detail: string | null;
  
  title: string;
  severity: string;
  summary: string;
  why_it_matters: string;
  suggested_action: string;
  evidence_references: any[];
  hydrated_evidence: any[];
  created_at: string;
  updated_at: string;
}

export interface ImprovementPlan {
  project_id: string;
  latest_verification_run_id: string | null;
  items: ImprovementItem[];
  is_empty: boolean;
  created_at: string;
}
