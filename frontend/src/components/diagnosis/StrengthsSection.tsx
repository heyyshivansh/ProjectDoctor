import React from "react";
import { FindingSummary } from "@/types/diagnosis";
import { CheckCircle2, ShieldCheck } from "lucide-react";

interface StrengthsSectionProps {
  strengths: FindingSummary[];
  onInspectFinding?: (findingId: string) => void;
}

export const StrengthsSection: React.FC<StrengthsSectionProps> = ({
  strengths,
  onInspectFinding,
}) => {
  if (strengths.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby="strengths-heading">
      <div className="border-b border-slate-200 pb-3">
        <h2 id="strengths-heading" className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span className="p-1 rounded-md bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          What Is Going Well? (Strengths)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Positive technical evidence and engineering practices verified in your project.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strengths.map((strength) => (
          <div
            key={strength.id}
            className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Verified Strength
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {strength.title}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                {strength.summary}
              </p>

              {strength.why_it_matters && (
                <div className="text-[11px] text-emerald-900/80 bg-emerald-100/50 p-2 rounded-lg border border-emerald-200/60 leading-relaxed">
                  <span className="font-semibold text-emerald-950">Why this matters: </span>
                  {strength.why_it_matters.replace(/^Why this matters for evaluation:\s*/i, "")}
                </div>
              )}
            </div>

            {onInspectFinding && (
              <div className="pt-2 border-t border-emerald-200/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => onInspectFinding(strength.id)}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  View Details & Evidence →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
