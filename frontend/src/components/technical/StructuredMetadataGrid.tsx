import React from "react";
import { FindingDetail } from "@/types/diagnosis";
import { Shield, GitCommit, Database, Hash, FileCode, CheckCircle2 } from "lucide-react";

interface StructuredMetadataGridProps {
  finding: FindingDetail;
}

/**
 * StructuredMetadataGrid: Presents technical audit metadata in a structured,
 * readable format. Styled with Project Doctor tokens.
 */
export const StructuredMetadataGrid: React.FC<StructuredMetadataGridProps> = ({ finding }) => {
  const ruleId = finding.technical_details?.rule_id || finding.finding_type;

  return (
    <div className="space-y-4 text-left">
      {/* Primary Key-Value Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Finding ID */}
        <div className="p-3.5 bg-[#0b0d10] rounded-xl border border-[#2a2f38] space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9aa0aa]">
            <Database className="w-3 h-3 text-[#c98a4b]" />
            Finding Identifier
          </span>
          <p className="text-xs font-mono text-[#eceae4] break-all select-all font-medium">
            {finding.id}
          </p>
        </div>

        {/* Rule Code */}
        <div className="p-3.5 bg-[#0b0d10] rounded-xl border border-[#2a2f38] space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9aa0aa]">
            <FileCode className="w-3 h-3 text-[#c98a4b]" />
            Diagnostic Rule
          </span>
          <p className="text-xs font-mono text-[#eceae4] break-all font-semibold">
            {ruleId}
          </p>
        </div>

        {/* Deterministic Hash */}
        <div className="p-3.5 bg-[#0b0d10] rounded-xl border border-[#2a2f38] space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9aa0aa]">
            <Hash className="w-3 h-3 text-[#c98a4b]" />
            Deterministic Hash
          </span>
          <p className="text-xs font-mono text-[#9aa0aa] truncate select-all" title={finding.finding_hash}>
            {finding.finding_hash}
          </p>
        </div>

        {/* Snapshot ID (conditional) */}
        {finding.snapshot_id && (
          <div className="p-3.5 bg-[#0b0d10] rounded-xl border border-[#2a2f38] space-y-1">
            <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9aa0aa]">
              <Shield className="w-3 h-3 text-[#c98a4b]" />
              Snapshot Anchor
            </span>
            <p className="text-xs font-mono text-[#eceae4] break-all select-all">
              {finding.snapshot_id}
            </p>
          </div>
        )}

        {/* Commit SHA (conditional) */}
        {finding.commit_sha && (
          <div className="p-3.5 bg-[#0b0d10] rounded-xl border border-[#2a2f38] space-y-1">
            <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9aa0aa]">
              <GitCommit className="w-3 h-3 text-[#c98a4b]" />
              Commit Anchor
            </span>
            <p className="text-xs font-mono text-[#eceae4] font-semibold">
              {finding.commit_sha.slice(0, 10)}
            </p>
          </div>
        )}

        {/* Severity Rank */}
        <div className="p-3.5 bg-[#0b0d10] rounded-xl border border-[#2a2f38] space-y-1">
          <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#9aa0aa]">
            <CheckCircle2 className="w-3 h-3 text-[#c98a4b]" />
            Severity Classification
          </span>
          <p className="text-xs font-mono uppercase font-bold text-[#eceae4]">
            {finding.severity}
          </p>
        </div>
      </div>

      {/* Evidence References Summary */}
      {finding.evidence_references && finding.evidence_references.length > 0 && (
        <div className="pt-2">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#9aa0aa] mb-2">
            Verifiable Evidence References ({finding.evidence_references.length})
          </h4>
          <div className="space-y-1.5">
            {finding.evidence_references.map((ref, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs font-mono px-3.5 py-2 bg-[#0b0d10] rounded-lg border border-[#2a2f38] text-[#eceae4]"
              >
                <span className="truncate max-w-md text-[#9aa0aa]">
                  {ref.target_type}: <span className="text-[#eceae4]">{ref.target_id}</span>
                </span>
                {ref.role && (
                  <span className="text-[11px] text-[#c98a4b] shrink-0 font-medium">
                    {ref.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
