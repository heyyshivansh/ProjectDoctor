export type ExtractionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "skipped_unsupported_type";

export interface DocumentSection {
  title: string;
  level: number;
  start_char: number;
  end_char: number;
  text_preview: string;
}

export interface DocumentExtractionSummary {
  id: string;
  artifact_id: string;
  project_id: string;
  status: ExtractionStatus;
  extractor_name: string;
  page_count?: number | null;
  word_count: number;
  character_count: number;
  sha256_hash?: string | null;
  created_at: string;
  updated_at: string;
  error_message?: string | null;
}

export interface DocumentExtraction extends DocumentExtractionSummary {
  text_storage_path?: string | null;
  text_preview?: string | null;
  sections: DocumentSection[];
  metadata?: Record<string, any>;
}

export interface BatchExtractionResponse {
  total_processed: number;
  completed_count: number;
  skipped_count: number;
  failed_count: number;
  extractions: DocumentExtractionSummary[];
}
