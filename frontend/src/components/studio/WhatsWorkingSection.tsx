import React from "react";
import { CuratedStrengthsDeck } from "@/components/findings/CuratedStrengthsDeck";
import { CheckCircle2 } from "lucide-react";
import { FindingSummary } from "@/types/diagnosis";

interface WhatsWorkingSectionProps {
  strengths: FindingSummary[];
}

export const WhatsWorkingSection: React.FC<WhatsWorkingSectionProps> = ({
  strengths,
}) => {
  if (!strengths || strengths.length === 0) return null;

  return (
    <div id="scene-whats-working" className="w-full space-y-8 pt-12 pb-16 scroll-mt-24">
      {/* Section Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-2.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#20232a] border border-[#2c303a] text-[11px] font-mono uppercase tracking-[0.25em] text-[#56b68b]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>WHAT'S WORKING</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-display font-medium text-[#f2efe9]">
          Verified Architectural Strengths
        </h2>
        <p className="text-xs sm:text-sm font-sans text-[#c4c8d0] max-w-lg">
          Deterministic capabilities and verified facts discovered in the evaluated project.
        </p>
      </div>

      {/* Curated 4-Pillar Strengths Deck */}
      <div className="max-w-4xl mx-auto">
        <CuratedStrengthsDeck strengths={strengths} />
      </div>
    </div>
  );
};
