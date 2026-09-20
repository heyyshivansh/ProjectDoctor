import React from "react";
import { AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { TactileSurface } from "@/components/shared/TactileSurface";

export interface AnalysisFailureRecoveryProps {
  errorMessage: string;
  onRetry: () => void;
  onContinue: () => void;
  continueLabel?: string;
}

/**
 * AnalysisFailureRecovery: Actionable recovery panel for partial or full pipeline errors.
 * Ensures student projects are never lost on network or parser errors.
 */
export const AnalysisFailureRecovery: React.FC<AnalysisFailureRecoveryProps> = ({
  errorMessage,
  onRetry,
  onContinue,
  continueLabel = "Continue to Studio",
}) => {
  return (
    <TactileSurface
      elevation="raised"
      className="p-5 border-[#e06c75]/40 bg-[#20232a] mt-4 space-y-4 text-left"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#e06c75] flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-left">
          <h4 className="text-sm font-semibold text-[#e06c75]">
            Encountered an issue during evaluation
          </h4>
          <p className="text-xs text-[#888e9b] leading-relaxed break-words font-mono">
            {errorMessage}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[#262a33]">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#181a1f] text-[#f2efe9] border border-[#262a33] hover:border-[#d4924f] hover:text-[#d4924f] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Step</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[#d4924f] text-[#111317] hover:bg-[#e5a84b] transition-colors font-semibold"
        >
          <span>{continueLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </TactileSurface>
  );
};
