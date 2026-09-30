export interface ImprovementItem {
  id: string;
  project_id: string;
  analysis_id: string | null;
  finding_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
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
  analysis_id: string | null;
  items: ImprovementItem[];
  is_empty: boolean;
  created_at: string;
}
