import React from "react";
import { FindingDetail, FindingSummary } from "@/types/diagnosis";
import { Lightbulb, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhyThisMattersProps {
  finding: FindingSummary | FindingDetail;
  className?: string;
}

export const WhyThisMatters: React.FC<WhyThisMattersProps> = ({ finding, className }) => {
  if (!finding.why_it_matters && !finding.suggested_action) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-4 shadow-sm",
        className
      )}
    >
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Level 3 • Diagnostic Rationale
        </span>
        <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
          Why this matters
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Why It Matters */}
        {finding.why_it_matters && (
          <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/70 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Technical Impact</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              {finding.why_it_matters}
            </p>
          </div>
        )}

        {/* Suggested Action */}
        {finding.suggested_action && (
          <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200/60 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-medium text-sm">
              <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Suggested Next Move</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {finding.suggested_action}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
