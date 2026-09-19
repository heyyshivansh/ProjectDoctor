import React, { useState } from "react";
import { FindingSummary } from "@/types/diagnosis";
import { FindingCard } from "./FindingCard";
import { CheckCircle2 } from "lucide-react";

interface FindingsSectionProps {
  findings: FindingSummary[];
  onInspectFinding: (findingId: string) => void;
}

export const FindingsSection: React.FC<FindingsSectionProps> = ({
  findings,
  onInspectFinding,
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Filter out strengths (they belong in StrengthsSection)
  const issueFindings = findings.filter((f) => f.severity !== "strength");

  const criticalCount = issueFindings.filter((f) => f.severity === "critical").length;
  const majorCount = issueFindings.filter((f) => f.severity === "major").length;
  const needsAttentionCount = issueFindings.filter((f) => f.severity === "needs_attention").length;
  const improvementCount = issueFindings.filter((f) => f.severity === "improvement").length;

  const filteredFindings = issueFindings.filter((f) => {
    if (severityFilter === "all") return true;
    return f.severity === severityFilter;
  });

  return (
    <section className="space-y-4" aria-labelledby="findings-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 id="findings-heading" className="text-xl font-bold text-slate-900 tracking-tight">
            What Needs Attention?
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Key findings, gaps, and potential risks identified from your specifications and repository code.
          </p>
        </div>

        {/* Filter buttons */}
        {issueFindings.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSeverityFilter("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                severityFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({issueFindings.length})
            </button>
            {criticalCount > 0 && (
              <button
                type="button"
                onClick={() => setSeverityFilter("critical")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  severityFilter === "critical"
                    ? "bg-rose-700 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                }`}
              >
                Critical ({criticalCount})
              </button>
            )}
            {majorCount > 0 && (
              <button
                type="button"
                onClick={() => setSeverityFilter("major")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  severityFilter === "major"
                    ? "bg-orange-700 text-white"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                }`}
              >
                Major ({majorCount})
              </button>
            )}
            {needsAttentionCount > 0 && (
              <button
                type="button"
                onClick={() => setSeverityFilter("needs_attention")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  severityFilter === "needs_attention"
                    ? "bg-amber-700 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                Attention ({needsAttentionCount})
              </button>
            )}
            {improvementCount > 0 && (
              <button
                type="button"
                onClick={() => setSeverityFilter("improvement")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  severityFilter === "improvement"
                    ? "bg-blue-700 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                }`}
              >
                Improvements ({improvementCount})
              </button>
            )}
          </div>
        )}
      </div>

      {issueFindings.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-2">
          <div className="inline-flex p-2 rounded-full bg-emerald-100 text-emerald-700 mb-1">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-emerald-950">
            No Critical or Major Issues Detected
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Project Doctor did not detect missing requirements, untested critical paths, or sensitive file exposures in the current snapshot.
          </p>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
          No findings matching the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onInspect={onInspectFinding}
            />
          ))}
        </div>
      )}
    </section>
  );
};
