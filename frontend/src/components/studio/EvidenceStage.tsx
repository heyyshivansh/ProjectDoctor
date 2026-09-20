import React from "react";
import { FindingDetail } from "@/types/diagnosis";
import { FileCode, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceStageProps {
  finding: FindingDetail;
  className?: string;
}

export const EvidenceStage: React.FC<EvidenceStageProps> = ({ finding, className }) => {
  const items = finding.hydrated_evidence || [];
  const references = finding.evidence_references || [];

  if (items.length === 0 && references.length === 0) {
    return (
      <div className={cn("rounded-xl border border-slate-200/90 bg-white p-6 text-left space-y-3", className)}>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Level 4 • Concrete Evidence
        </span>
        <p className="text-sm text-slate-500 font-normal">
          This finding was synthesized from holistic project structure and has no direct isolated line reference.
        </p>
      </div>
    );
  }

  // Categorize evidence items
  const requirementItems = items.filter((i) => i.target_type === "requirement" || i.target_type === "artifact");
  const codeItems = items.filter((i) => i.target_type === "repository_file" || i.target_type === "repository_evidence");
  const otherItems = items.filter(
    (i) => i.target_type !== "requirement" && i.target_type !== "artifact" && i.target_type !== "repository_file" && i.target_type !== "repository_evidence"
  );

  const totalItemsCount = items.length;

  return (
    <section aria-label="Concrete Evidence" className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Level 4 • Evidence Anchors
        </span>
        <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
          Supporting Evidence
        </h3>
        <p className="text-xs text-slate-500 font-normal">
          Concrete specification excerpts and codebase artifacts ground this diagnosis.
        </p>
      </div>

      {/* Dynamic Grid: Only creates 2 columns if multiple distinct evidence items exist */}
      <div
        className={cn(
          "grid gap-4",
          totalItemsCount >= 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        )}
      >
        {/* Requirement & Document Excerpts */}
        {requirementItems.map((item, idx) => (
          <div
            key={`req-${item.target_id || idx}`}
            className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 text-left shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-medium text-sm">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{item.title || "Specification Requirement"}</span>
              </div>
              {item.page_number && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Page {item.page_number}
                </span>
              )}
            </div>

            {item.section_title && (
              <div className="text-xs text-slate-500 font-medium">
                Section: {item.section_title}
              </div>
            )}

            {item.snippet && (
              <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-lg text-xs font-mono text-slate-800 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {item.snippet}
              </div>
            )}
          </div>
        ))}

        {/* Code & Repository Snippets */}
        {codeItems.map((item, idx) => (
          <div
            key={`code-${item.target_id || idx}`}
            className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 text-left shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-medium text-sm min-w-0">
                <FileCode className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate font-mono text-xs text-slate-800">
                  {item.file_path || "Repository File"}
                </span>
              </div>
              {item.line_start && (
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                  L{item.line_start}
                  {item.line_end && item.line_end !== item.line_start ? `-L${item.line_end}` : ""}
                </span>
              )}
            </div>

            {item.snippet ? (
              <div className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-100 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {item.snippet}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">
                File located in repository snapshot with no excerpt attached.
              </div>
            )}
          </div>
        ))}

        {/* Other / Traceability Items */}
        {otherItems.map((item, idx) => (
          <div
            key={`other-${item.target_id || idx}`}
            className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 text-left shadow-sm"
          >
            <div className="flex items-center gap-2 text-slate-900 font-medium text-sm border-b border-slate-100 pb-2.5">
              <Layers className="w-4 h-4 text-purple-600 shrink-0" />
              <span>{item.title || item.evidence_type || "Traceability Link"}</span>
            </div>

            {item.snippet && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed font-mono">
                {item.snippet}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fallback references when hydrated details are not present */}
      {items.length === 0 && references.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-left">
          <span className="text-xs font-medium text-slate-700">Referenced Entities:</span>
          <div className="flex flex-wrap gap-2">
            {references.map((ref, idx) => (
              <span
                key={`${ref.target_id}-${idx}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700"
              >
                <span>{ref.target_type}:</span>
                <span>{ref.target_id.slice(0, 8)}...</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
