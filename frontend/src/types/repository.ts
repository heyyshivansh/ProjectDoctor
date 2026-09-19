export interface RepositoryEvidence {
  id: string;
  snapshot_id: string;
  project_id: string;
  commit_sha: string;
  file_path: string;
  evidence_type: "manifest" | "configuration" | "entrypoint" | "test_suite" | "documentation" | string;
  language?: string | null;
  start_line?: number | null;
  end_line?: number | null;
  content_snippet?: string | null;
  evidence_hash: string;
  extraction_method: string;
  created_at: string;
}

export interface RepositoryFile {
  id: string;
  snapshot_id: string;
  file_path: string;
  file_name: string;
  file_extension?: string | null;
  language?: string | null;
  file_size_bytes: number;
  blob_sha: string;
  is_binary: boolean;
  is_ignored: boolean;
  content_status: string;
  created_at: string;
}

export interface RepositorySnapshot {
  id: string;
  repository_id: string;
  project_id: string;
  commit_sha: string;
  commit_message?: string | null;
  commit_author?: string | null;
  commit_date?: string | null;
  branch: string;
  total_files: number;
  total_size_bytes: number;
  structure_summary?: {
    total_files?: number;
    total_size_bytes?: number;
    languages?: Record<string, number>;
    evidence_counts?: Record<string, number>;
  } | null;
  is_current: boolean;
  status: string;
  error_message?: string | null;
  created_at: string;
}

export interface RepositoryConnection {
  id: string;
  project_id: string;
  repo_url: string;
  owner: string;
  repo_name: string;
  default_branch: string;
  is_private: boolean;
  has_token: boolean;
  status: string;
  last_sync_at?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  current_snapshot?: RepositorySnapshot | null;
}

export interface RepositoryConnectInput {
  repo_url: string;
  access_token?: string;
}

export interface RepositorySyncResult {
  status: "synced" | "up_to_date" | string;
  message: string;
  snapshot: RepositorySnapshot;
}
