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
        state === "in_progress" && "bg-[#20232a] border-[#d4924f]/40 shadow-[0_0_16px_rgba(212,146,79,0.15)]",
        state === "completed" && "bg-[#181a1f] border-[#262a33]",
        state === "waiting" && "bg-[#181a1f]/50 border-[#262a33]/50 opacity-60",
        state === "error" && "bg-[#e06c75]/10 border-[#e06c75]/40"
      )}
    >
      {/* State Indicator */}
      <div className="flex-shrink-0 mt-0.5">
        {state === "completed" && (
          <CheckCircle2 className="w-4 h-4 text-[#56b68b]" />
        )}
        {state === "in_progress" && (
          <Loader2 className="w-4 h-4 text-[#d4924f] animate-spin" />
        )}
        {state === "waiting" && (
          <div className="w-4 h-4 rounded-full border border-[#5d6370] flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-[#5d6370]" />
          </div>
        )}
        {state === "error" && (
          <AlertCircle className="w-4 h-4 text-[#e06c75]" />
        )}
      </div>

      {/* Label and Detail */}
      <div className="flex-1 min-w-0 text-left">
        <p
          className={cn(
            "text-xs sm:text-sm font-mono",
            state === "completed" && "text-[#f2efe9] font-medium",
            state === "in_progress" && "text-[#d4924f] font-semibold",
            state === "waiting" && "text-[#5d6370]",
            state === "error" && "text-[#e06c75] font-semibold"
          )}
        >
          {label}
        </p>
        {detail && (
          <p className="text-xs font-sans text-[#888e9b] mt-1 break-words leading-relaxed">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
};
