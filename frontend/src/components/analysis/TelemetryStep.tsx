import React from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "waiting" | "in_progress" | "completed" | "error";

export interface TelemetryStepProps {
  label: string;
  detail?: string;
  state: StepState;
  index: number;
}

/**
 * TelemetryStep: Represents a single observable asynchronous pipeline step.
 * Styled with Project Doctor tokens and honest state indicators.
 */
export const TelemetryStep: React.FC<TelemetryStepProps> = ({
  label,
  detail,
  state,
  index,
}) => {
  return (
    <div
      role="status"
      aria-label={`Step ${index + 1}: ${label} - ${state}`}
      className={cn(
        "flex items-start gap-3.5 p-3.5 rounded-xl transition-colors border",
        state === "in_progress" && "bg-[var(--pd-surface-raised)] border-[var(--pd-accent)]/40 shadow-[0_0_16px_rgba(99,102,241,0.15)]",
        state === "completed" && "bg-[var(--pd-surface)] border-[var(--pd-hairline)]",
        state === "waiting" && "bg-[var(--pd-surface)]/50 border-[var(--pd-hairline)]/50 opacity-60",
        state === "error" && "bg-[var(--pd-critical)]/10 border-[var(--pd-critical)]/40"
      )}
    >
      {/* State Indicator */}
      <div className="flex-shrink-0 mt-0.5">
        {state === "completed" && (
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
        )}
        {state === "in_progress" && (
          <Loader2 className="w-4 h-4 text-[var(--pd-accent)] animate-spin" />
        )}
        {state === "waiting" && (
          <div className="w-4 h-4 rounded-full border border-[var(--pd-hairline)] flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-[var(--pd-text-muted)]" />
          </div>
        )}
        {state === "error" && (
          <AlertCircle className="w-4 h-4 text-[var(--pd-critical)]" />
        )}
      </div>

      {/* Label and Detail */}
      <div className="flex-1 min-w-0 text-left">
        <p
          className={cn(
            "text-xs sm:text-sm font-mono",
            state === "completed" && "text-[var(--pd-text-primary)] font-medium",
            state === "in_progress" && "text-[var(--pd-accent)] font-semibold",
            state === "waiting" && "text-[var(--pd-text-muted)]",
            state === "error" && "text-[var(--pd-critical)] font-semibold"
          )}
        >
          {label}
        </p>
        {detail && (
          <p className="text-xs font-sans text-[var(--pd-text-muted)] mt-1 break-words leading-relaxed">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
};
