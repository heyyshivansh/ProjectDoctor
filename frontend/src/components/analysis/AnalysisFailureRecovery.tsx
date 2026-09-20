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
  continueLabel = "Continue to Review Desk",
}) => {
  return (
    <TactileSurface
      elevation="raised"
      className="p-5 border-[var(--pd-critical)]/40 bg-[var(--pd-surface-raised)] mt-4 space-y-4 text-left rounded-xl"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[var(--pd-critical)] flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-left">
          <h4 className="text-sm font-semibold text-[var(--pd-critical)] font-sans">
            Encountered an issue during evaluation
          </h4>
          <p className="text-xs text-[var(--pd-text-muted)] leading-relaxed break-words font-mono">
            {errorMessage}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-[var(--pd-hairline)]">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[var(--pd-surface)] text-[var(--pd-text-primary)] border border-[var(--pd-hairline)] hover:border-[var(--pd-accent)] hover:text-[var(--pd-accent)] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Step</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[var(--pd-accent)] text-white hover:bg-[var(--pd-accent-hover)] transition-colors font-semibold"
        >
          <span>{continueLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </TactileSurface>
  );
};
