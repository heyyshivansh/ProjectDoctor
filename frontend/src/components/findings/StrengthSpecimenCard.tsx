import React from "react";
import { FindingSummary } from "@/types/diagnosis";
import { CheckCircle2 } from "lucide-react";
import { TactileSurface } from "@/components/shared/TactileSurface";

interface StrengthSpecimenCardProps {
  strength: FindingSummary;
}

/**
 * StrengthSpecimenCard: Displays a confirmed architectural strength.
 */
export const StrengthSpecimenCard: React.FC<StrengthSpecimenCardProps> = ({ strength }) => {
  return (
    <TactileSurface elevation="raised" className="p-5 border-emerald-100 bg-emerald-50/20">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
              Verified Strength
            </span>
          </div>
          <h4 className="text-sm sm:text-base font-semibold text-slate-900">
            {strength.title}
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {strength.summary}
          </p>
          {strength.why_it_matters && (
            <p className="text-xs text-slate-500 pt-1 border-t border-emerald-100/60 mt-2">
              <strong className="text-slate-700 font-medium">Why this is sound: </strong>
              {strength.why_it_matters}
            </p>
          )}
        </div>
      </div>
    </TactileSurface>
  );
};
