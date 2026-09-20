import React, { useState } from "react";
import { FindingSummary, FindingDetail } from "@/types/diagnosis";
import { getFindingDetail } from "@/services/diagnosis";
import { TactileSurface } from "@/components/shared/TactileSurface";
import { ArrowRight, ChevronDown, ChevronUp, FileCode, CheckCircle2, Loader2 } from "lucide-react";

interface WhatsWorkingCardProps {
  strength: FindingSummary;
}

export const WhatsWorkingCard: React.FC<WhatsWorkingCardProps> = ({ strength }) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const [detail, setDetail] = useState<FindingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleEvidence = async () => {
    if (!showEvidence && !detail) {
      setIsLoading(true);
      try {
        const d = await getFindingDetail(strength.project_id, strength.id);
        setDetail(d);
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    setShowEvidence((prev) => !prev);
  };

  const references = detail?.evidence_references || [];
  const hydrated = detail?.hydrated_evidence || [];

  return (
    <TactileSurface
      elevation="raised"
      className="p-6 sm:p-8 bg-[#15181d] border-[#2a2f38] text-[#eceae4] space-y-4 text-left transition-all hover:border-[#4fae82]/40"
    >
      {/* Category / Title in Uppercase */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4fae82]" />
          <h3 className="text-sm sm:text-base font-mono uppercase tracking-wider font-semibold text-[#eceae4]">
            {strength.title}
          </h3>
        </div>
      </div>

      {/* Affirmative Narrative Summary */}
      <p className="text-sm sm:text-base font-sans text-[#9aa0aa] leading-relaxed">
        {strength.summary}
      </p>

      {/* Interactive Evidence Disclosure */}
      <div className="pt-3 border-t border-[#2a2f38]">
        <button
          type="button"
          onClick={handleToggleEvidence}
          disabled={isLoading}
          className="inline-flex items-center gap-2 text-xs font-mono text-[#4fae82] hover:text-[#4fae82]/80 transition-colors focus:outline-none focus:underline"
        >
          <span>Evidence</span>
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4fae82]" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          {showEvidence ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#5c626f]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#5c626f]" />
          )}
        </button>

        {/* Revealed Evidence */}
        {showEvidence && (
          <div className="mt-3 space-y-2 pt-2 border-t border-[#2a2f38]/60">
            {hydrated.length > 0 ? (
              hydrated.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono px-3.5 py-2 bg-[#0b0d10] rounded-lg border border-[#2a2f38] text-[#eceae4]"
                >
                  <span className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-[#4fae82]" />
                    <span className="text-[#9aa0aa]">{item.target_type}:</span>
                    <span className="text-[#eceae4] truncate">{item.file_path || item.title || item.target_id}</span>
                  </span>
                  {item.line_start && (
                    <span className="text-[11px] text-[#4fae82] shrink-0 font-medium">
                      L{item.line_start}
                    </span>
                  )}
                </div>
              ))
            ) : references.length > 0 ? (
              references.map((ref, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-mono px-3.5 py-2 bg-[#0b0d10] rounded-lg border border-[#2a2f38] text-[#eceae4]"
                >
                  <span className="flex items-center gap-2 truncate">
                    <FileCode className="w-3.5 h-3.5 text-[#4fae82]" />
                    <span className="text-[#9aa0aa]">{ref.target_type}:</span>
                    <span className="text-[#eceae4] truncate">{ref.target_id}</span>
                  </span>
                  {ref.role && (
                    <span className="text-[11px] text-[#4fae82] shrink-0 font-medium">
                      {ref.role}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-xs font-mono text-[#9aa0aa] bg-[#0b0d10] rounded-lg border border-[#2a2f38] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4fae82]" />
                <span>Verified by diagnostic rule engine: {strength.finding_type}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </TactileSurface>
  );
};
