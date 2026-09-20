import React, { useState } from "react";
import { FindingDetail, FindingSummary } from "@/types/diagnosis";
import { ChevronDown, ChevronUp, Shield, Hash, GitCommit, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface TechnicalVaultProps {
  finding: FindingDetail | FindingSummary;
  className?: string;
}

export const TechnicalVault: React.FC<TechnicalVaultProps> = ({ finding, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const detail = finding as FindingDetail;
  const hasTechnicalDetails =
    detail.technical_details && Object.keys(detail.technical_details).length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-slate-50/70 overflow-hidden transition-all text-left",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full py-3 px-4 flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors focus:outline-none focus:bg-slate-100"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Technical Audit Vault (Level 5 Forensic Proof)</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span>{isOpen ? "Hide" : "Show"}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-200/80 space-y-4 bg-white animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Finding Hash */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Hash className="w-3 h-3" />
                <span>Deterministic Finding Hash</span>
              </div>
              <p className="font-mono text-slate-700 break-all select-all">
                {finding.finding_hash || "N/A"}
              </p>
            </div>

            {/* Rule / Type */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <FileCode className="w-3 h-3" />
                <span>Finding Classification</span>
              </div>
              <p className="font-mono text-slate-700 break-all">
                {finding.finding_type} ({finding.severity})
              </p>
            </div>

            {/* Snapshot ID */}
            {finding.snapshot_id && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <FileCode className="w-3 h-3" />
                  <span>Pinned Snapshot ID</span>
                </div>
                <p className="font-mono text-slate-700 break-all select-all">
                  {finding.snapshot_id}
                </p>
              </div>
            )}

            {/* Commit SHA */}
            {finding.commit_sha && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <GitCommit className="w-3 h-3" />
                  <span>Commit SHA</span>
                </div>
                <p className="font-mono text-slate-700 break-all select-all">
                  {finding.commit_sha}
                </p>
              </div>
            )}
          </div>

          {/* Raw Technical Details JSON */}
          {hasTechnicalDetails && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Raw Rule Diagnostic Payload
              </span>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed max-h-60">
                {JSON.stringify(detail.technical_details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
