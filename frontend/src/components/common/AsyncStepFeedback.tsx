import React from "react";
import { Check, Loader2, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StepState = "idle" | "running" | "success" | "error" | "skipped";

interface AsyncStepFeedbackProps {
  label: string;
  state: StepState;
  errorMessage?: string | null;
  onRetry?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  retryLabel?: string;
}

export const AsyncStepFeedback: React.FC<AsyncStepFeedbackProps> = ({
  label,
  state,
  errorMessage,
  onRetry,
  onContinue,
  continueLabel = "Continue anyway",
  retryLabel = "Retry",
}) => {
  return (
    <div className="py-2.5 px-3 rounded-lg bg-slate-50/70 border border-slate-200/70 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {state === "idle" && (
            <div className="w-4 h-4 rounded-full border border-slate-300 bg-white shrink-0" />
          )}
          {state === "running" && (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          )}
          {state === "success" && (
            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
          {state === "error" && (
            <div className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3 h-3" />
            </div>
          )}
          {state === "skipped" && (
            <div className="w-4 h-4 rounded-full border border-slate-200 bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 text-[10px]">
              —
            </div>
          )}
          <span
            className={cn(
              "text-sm truncate",
              state === "running" && "font-medium text-slate-900",
              state === "success" && "text-slate-700",
              state === "error" && "font-medium text-rose-900",
              state === "idle" && "text-slate-400",
              state === "skipped" && "text-slate-400 italic"
            )}
          >
            {label}
          </span>
        </div>

        {state === "error" && (
          <div className="flex items-center gap-2 shrink-0">
            {onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 text-xs px-2.5 gap-1 border-rose-200 text-rose-800 hover:bg-rose-50"
              >
                <RefreshCw className="w-3 h-3" />
                {retryLabel}
              </Button>
            )}
            {onContinue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onContinue}
                className="h-7 text-xs px-2 text-slate-600 hover:bg-slate-200/50 gap-1"
              >
                {continueLabel}
                <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {state === "error" && errorMessage && (
        <p className="mt-1.5 text-xs text-rose-600 pl-6.5 break-words font-normal">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
