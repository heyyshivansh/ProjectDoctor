import React from "react";
import { HelpCircle, Lightbulb } from "lucide-react";

interface WhyItMattersCardProps {
  whyItMatters: string;
  suggestedAction?: string | null;
}

/**
 * WhyItMattersCard: The architectural rationale and suggested action block
 * embedded directly within the FindingDossierCard.
 */
export const WhyItMattersCard: React.FC<WhyItMattersCardProps> = ({
  whyItMatters,
  suggestedAction,
}) => {
  return (
    <div className="p-5 sm:p-6 rounded-xl bg-[#20232a]/70 border border-[#2c303a] space-y-4 text-left">
      {/* Rationale Section */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#888e9b]">
          <HelpCircle className="w-3.5 h-3.5 text-[#d4924f]" />
          <span>Architectural Rationale</span>
        </div>
        <p className="text-sm sm:text-base font-sans text-[#f2efe9] leading-relaxed font-normal">
          {whyItMatters}
        </p>
      </div>

      {/* Suggested Next Move (only if provided by backend) */}
      {suggestedAction && (
        <div className="pt-3.5 border-t border-[#2c303a]/70 space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#e5a84b]">
            <Lightbulb className="w-3.5 h-3.5 text-[#e5a84b]" />
            <span>Suggested Architectural Action</span>
          </div>
          <p className="text-xs sm:text-sm font-sans text-[#c4c8d0] leading-relaxed">
            {suggestedAction}
          </p>
        </div>
      )}
    </div>
  );
};
