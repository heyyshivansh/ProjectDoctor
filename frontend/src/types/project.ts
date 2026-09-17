export interface Artifact {
  id: string;
  project_id: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  status: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  problem_statement: string;
  description: string;
  requirements?: string | null;
  tech_stack?: string[] | null;
  architecture_summary?: string | null;
  github_repo_url?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  status: string;
  artifact_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: ProjectListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProjectDetail extends Project {
  artifacts: Artifact[];
}

export interface ProjectCreateInput {
  title: string;
  problem_statement: string;
  description: string;
  requirements?: string;
  tech_stack?: string[];
  architecture_summary?: string;
  github_repo_url?: string;
}
