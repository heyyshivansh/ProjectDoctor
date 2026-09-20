import React from "react";
import { FindingSummary } from "@/types/diagnosis";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrengthSpotlightCardProps {
  strength: FindingSummary;
  className?: string;
}

export const StrengthSpotlightCard: React.FC<StrengthSpotlightCardProps> = ({
  strength,
  className,
}) => {
  return (
    <div
      className={cn(
        "p-5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 text-left space-y-2.5 transition-all shadow-none",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          <span>Verified Strength</span>
        </span>
      </div>

      <h3 className="text-base font-semibold text-slate-900 leading-snug">
        {strength.title}
      </h3>

      <p className="text-sm text-slate-600 leading-relaxed font-normal">
        {strength.summary}
      </p>

      {strength.why_it_matters && (
        <div className="pt-2 border-t border-emerald-200/50 text-xs text-emerald-900 font-normal leading-relaxed">
          <span className="font-medium">Impact: </span>
          {strength.why_it_matters}
        </div>
      )}
    </div>
  );
};
