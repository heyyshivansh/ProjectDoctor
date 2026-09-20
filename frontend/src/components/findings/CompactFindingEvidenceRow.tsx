import React, { useState } from "react";
import { FindingSummary, HydratedEvidenceItem } from "@/types/diagnosis";
import { FileCode, FileText, ExternalLink, ChevronDown, ChevronUp, GitCommit } from "lucide-react";

interface CompactFindingEvidenceRowProps {
  finding: FindingSummary;
  evidence: HydratedEvidenceItem[];
  commitSha?: string | null;
  onInspectCodebase?: (filePath?: string) => void;
  onInspectRequirements?: (requirementId?: string) => void;
  onInspectDocuments?: (artifactId?: string) => void;
}

export const CompactFindingEvidenceRow: React.FC<CompactFindingEvidenceRowProps> = ({
  finding,
  evidence,
  commitSha,
  onInspectCodebase,
  onInspectRequirements,
  onInspectDocuments,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Group or identify primary evidence items
  const repoEvidence = evidence.filter(
    (e) => e.target_type === "repository_file" || e.target_type === "repository_evidence" || Boolean(e.file_path)
  );
  const reqEvidence = evidence.filter(
    (e) => e.target_type === "requirement" || e.target_type === "traceability"
  );
  const docEvidence = evidence.filter((e) => e.target_type === "artifact");

  // Fallback extraction from summary/title if hydrated evidence is empty
  const detectedFilePath =
    repoEvidence[0]?.file_path ||
    (() => {
      const match = finding.summary.match(/'([^']+)'/) || finding.title.match(/'([^']+)'/);
      return match ? match[1] : null;
    })();

  return (
    <div className="space-y-3 pt-4 border-t border-[#2c303a]/70">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#888e9b] flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-[#d4924f]" />
          Canonical Evidence Proof
        </span>

        {commitSha && (
          <span className="text-[11px] font-mono text-[#5a606e] flex items-center gap-1">
            <GitCommit className="w-3 h-3 text-[#d4924f]" />
            {commitSha.slice(0, 7)}
          </span>
        )}
      </div>

      {/* Concrete Proof Line(s) */}
      <div className="space-y-2">
        {detectedFilePath && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#111317]/80 border border-[#2c303a] text-xs font-mono">
            <div className="flex items-center gap-2 text-[#f2efe9] min-w-0">
              <FileCode className="w-3.5 h-3.5 text-[#d4924f] shrink-0" />
              <span className="truncate text-[#f2efe9] font-medium">{detectedFilePath}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#20232a] text-[#888e9b] border border-[#2c303a]">
                Repository File
              </span>
            </div>

            {onInspectCodebase && (
              <button
                type="button"
                onClick={() => onInspectCodebase(detectedFilePath)}
                className="inline-flex items-center gap-1 text-[11px] text-[#d4924f] hover:text-[#e2a15f] transition-colors shrink-0 ml-auto"
              >
                <span>Inspect in Codebase</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {reqEvidence.map((req, idx) => (
          <div
            key={`req-${idx}`}
            className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#111317]/80 border border-[#2c303a] text-xs font-mono"
          >
            <div className="flex items-center gap-2 text-[#f2efe9] min-w-0">
              <FileText className="w-3.5 h-3.5 text-[#56b68b] shrink-0" />
              <span className="truncate text-[#f2efe9] font-medium">
                {req.title || `Requirement ${req.target_id}`}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#20232a] text-[#888e9b] border border-[#2c303a]">
                Specification
              </span>
            </div>

            {onInspectRequirements && (
              <button
                type="button"
                onClick={() => onInspectRequirements(req.target_id)}
                className="inline-flex items-center gap-1 text-[11px] text-[#d4924f] hover:text-[#e2a15f] transition-colors shrink-0 ml-auto"
              >
                <span>Inspect in Requirements</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {docEvidence.map((doc, idx) => (
          <div
            key={`doc-${idx}`}
            className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#111317]/80 border border-[#2c303a] text-xs font-mono"
          >
            <div className="flex items-center gap-2 text-[#f2efe9] min-w-0">
              <FileText className="w-3.5 h-3.5 text-[#d4924f] shrink-0" />
              <span className="truncate text-[#f2efe9] font-medium">
                {doc.title || doc.file_path || `Document ${doc.target_id}`}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#20232a] text-[#888e9b] border border-[#2c303a]">
                Document
              </span>
            </div>

            {onInspectDocuments && (
              <button
                type="button"
                onClick={() => onInspectDocuments(doc.target_id)}
                className="inline-flex items-center gap-1 text-[11px] text-[#d4924f] hover:text-[#e2a15f] transition-colors shrink-0 ml-auto"
              >
                <span>Inspect in Documents</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {!detectedFilePath && reqEvidence.length === 0 && docEvidence.length === 0 && (
          <div className="p-2.5 rounded-lg bg-[#111317]/60 border border-[#2c303a] text-xs font-mono text-[#888e9b]">
            Evidence evaluated across snapshot commit {commitSha ? commitSha.slice(0, 7) : "HEAD"}.
          </div>
        )}
      </div>

      {/* Deep Technical Metadata Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#888e9b] hover:text-[#f2efe9] transition-colors"
        >
          <span>Technical Audit Details</span>
          {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showTechnicalDetails && (
          <div className="mt-2 p-3 rounded-lg bg-[#111317] border border-[#2c303a] text-[11px] font-mono space-y-1.5 text-[#888e9b]">
            <div className="flex justify-between gap-4">
              <span className="text-[#5a606e]">Rule Code:</span>
              <span className="text-[#f2efe9]">{finding.finding_type || "DIAG"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#5a606e]">Finding Hash:</span>
              <span className="text-[#c4c8d0] truncate max-w-[240px] sm:max-w-xs">{finding.finding_hash}</span>
            </div>
            {finding.snapshot_id && (
              <div className="flex justify-between gap-4">
                <span className="text-[#5a606e]">Snapshot ID:</span>
                <span className="text-[#c4c8d0] truncate max-w-[240px] sm:max-w-xs">{finding.snapshot_id}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
