import React from "react";
import {
  CheckCircle2,
  Loader2,
  Circle,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  X,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";
import { AnalysisStatusResponse, AnalysisStageInfo } from "@/types/analysis";

interface AnalysisWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusResponse: AnalysisStatusResponse | null;
  onReviewFindings: () => void;
  onRetry: () => void;
  isStarting?: boolean;
}

interface CheckedItem {
  key: string;
  label: string;
  detail: string;
  isAiUnavailable?: boolean;
}

const buildCheckedItems = (
  stages: AnalysisStageInfo[],
  aiStatus?: string | null
): CheckedItem[] => {
  const stageMap = new Map(stages.map((s) => [s.stage, s]));

  const stageDocs = stageMap.get("STAGE_DOCUMENTS");
  const stageUnd = stageMap.get("STAGE_UNDERSTANDING");
  const stageReq = stageMap.get("STAGE_REQUIREMENTS");
  const stageRepo = stageMap.get("STAGE_REPOSITORY");
  const stageTrace = stageMap.get("STAGE_TRACEABILITY");
  const stageDiag = stageMap.get("STAGE_DIAGNOSIS");
  const stageAi = stageMap.get("STAGE_AI_REVIEW");

  const isAiUnavailable = aiStatus === "unavailable" || stageAi?.status === "failed";

  return [
    {
      key: "docs",
      label: "Project documentation",
      detail: stageDocs?.detail || "Specification documents verified",
    },
    {
      key: "understanding",
      label: "Project understanding",
      detail: stageUnd?.detail || "Using existing project understanding",
    },
    {
      key: "requirements",
      label: "Verifiable project claims",
      detail: stageReq?.detail || "Verified project claims",
    },
    {
      key: "repository",
      label: "GitHub repository",
      detail: stageRepo?.detail || "Repository snapshot verified",
    },
    {
      key: "traceability",
      label: "Implementation evidence",
      detail: stageTrace?.detail || "Verified implementation evidence matches claims",
    },
    {
      key: "diagnosis",
      label: "Deterministic evaluation",
      detail: stageDiag?.detail || "Deterministic diagnosis rules evaluated",
    },
    {
      key: "ai",
      label: isAiUnavailable ? "Deeper AI review unavailable" : "Deeper AI interpretation",
      detail: isAiUnavailable
        ? "Core evaluation completed without deeper AI review"
        : stageAi?.detail || "Deeper AI review included",
      isAiUnavailable,
    },
  ];
};

export const AnalysisWorkspaceModal: React.FC<AnalysisWorkspaceModalProps> = ({
  isOpen,
  onClose,
  statusResponse,
  onReviewFindings,
  onRetry,
  isStarting = false,
}) => {
  if (!isOpen) return null;

  const status = statusResponse?.status || (isStarting ? "running" : "not_started");
  const stages: AnalysisStageInfo[] = statusResponse?.stages || [];
  const projectTitle = statusResponse?.project_title || "your project";
  const isRunning = status === "running" || isStarting;
  const isCompleted = status === "completed";
  const isInterrupted = status === "interrupted";
  const isFailed = status === "failed";
  const isInsufficient = status === "insufficient_evidence";

  const checkedItems = buildCheckedItems(stages, statusResponse?.ai_status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] shadow-pd-elevated rounded-2xl p-6 sm:p-7 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with status eyebrow and dismiss */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--pd-ai)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--pd-ai)]"></span>
              </span>
            )}
            <span className="text-[11px] font-mono tracking-widest uppercase text-[var(--pd-text-muted)]">
              {isRunning && "Project Doctor is Investigating"}
              {isCompleted && "Evaluation Complete"}
              {isInterrupted && "Evaluation Stopped"}
              {isFailed && "Evaluation Error"}
              {isInsufficient && "Prerequisites Missing"}
              {!isRunning && !isCompleted && !isInterrupted && !isFailed && !isInsufficient && "Project Doctor"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] p-1 rounded-lg hover:bg-[var(--pd-surface-raised)] transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PHASE 1: INVESTIGATION (RUNNING STATE) */}
        {/* ------------------------------------------------------------------ */}
        {isRunning && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 id="modal-title" className="text-xl font-semibold text-[var(--pd-text-primary)] tracking-tight">
                Project Doctor is investigating
              </h2>
              <p className="text-sm text-[var(--pd-text-body)] mt-1">
                Comparing your documentation with what your repository can demonstrate.
              </p>
            </div>

            {/* Stages Progress List */}
            <div className="space-y-2 py-1">
              {stages.map((stage) => {
                const isActive = stage.status === "active";
                const isDone = stage.status === "completed";
                const isStageFailed = stage.status === "failed";

                return (
                  <div
                    key={stage.stage}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--pd-ai-wash)] border border-[var(--pd-ai)]/20"
                        : "border border-transparent"
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isDone && (
                        <CheckCircle2 className="w-4 h-4 text-[var(--pd-mint)]" />
                      )}
                      {isActive && (
                        <Loader2 className="w-4 h-4 text-[var(--pd-ai)] animate-spin" />
                      )}
                      {!isDone && !isActive && !isStageFailed && (
                        <Circle className="w-4 h-4 text-[var(--pd-text-faint)]" />
                      )}
                      {isStageFailed && (
                        <AlertTriangle className="w-4 h-4 text-[var(--pd-coral)]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-medium ${
                            isActive
                              ? "text-[var(--pd-text-primary)]"
                              : isDone
                              ? "text-[var(--pd-text-body)]"
                              : "text-[var(--pd-text-faint)]"
                          }`}
                        >
                          {stage.label}
                        </span>

                        {isDone && stage.detail && (
                          <span className="text-xs font-mono text-[var(--pd-text-muted)] truncate max-w-[260px]">
                            {stage.detail}
                          </span>
                        )}
                      </div>

                      {isActive && (
                        <p className="text-xs text-[var(--pd-text-muted)] mt-0.5 animate-pulse">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Run in Background action */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-xl transition-colors"
              >
                Run in Background
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PHASE 2: COMPLETION SUMMARY */}
        {/* ------------------------------------------------------------------ */}
        {isCompleted && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--pd-mint-wash)] border border-[var(--pd-mint)]/20 flex items-center justify-center flex-shrink-0 text-[var(--pd-mint)]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 id="modal-title" className="text-xl font-semibold text-[var(--pd-text-primary)] tracking-tight">
                  Evaluation Complete
                </h2>
                <p className="text-sm text-[var(--pd-text-body)] mt-1">
                  Project Doctor finished evaluating {projectTitle}.
                </p>
              </div>
            </div>

            {/* What Was Checked Section */}
            <div className="space-y-2.5">
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-semibold">
                What Was Checked
              </h3>
              <div className="bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-xl p-3.5 space-y-2 divide-y divide-[var(--pd-border)]">
                {checkedItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 text-xs pt-2 first:pt-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.isAiUnavailable ? (
                        <span className="w-4 h-4 rounded-full bg-[var(--pd-amber-wash)] border border-[var(--pd-amber)]/30 flex items-center justify-center text-[var(--pd-amber)] text-[10px] font-bold flex-shrink-0">
                          !
                        </span>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-[var(--pd-mint)] flex-shrink-0" />
                      )}
                      <span
                        className={`font-medium truncate ${
                          item.isAiUnavailable ? "text-[var(--pd-amber)]" : "text-[var(--pd-text-body)]"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-[var(--pd-text-muted)] truncate max-w-[280px] flex-shrink-0 text-right">
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verdict summary counts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--pd-coral-wash)] border border-[var(--pd-coral)]/20 flex flex-col gap-1">
                <span className="text-2xl font-bold text-[var(--pd-coral)]">
                  {statusResponse?.critical_count ?? 0}
                </span>
                <span className="text-xs font-medium text-[var(--pd-text-body)]">Critical Concerns</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--pd-amber-wash)] border border-[var(--pd-amber)]/20 flex flex-col gap-1">
                <span className="text-2xl font-bold text-[var(--pd-amber)]">
                  {statusResponse?.needs_attention_count ?? 0}
                </span>
                <span className="text-xs font-medium text-[var(--pd-text-body)]">Areas Needing Attention</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--pd-mint-wash)] border border-[var(--pd-mint)]/20 flex flex-col gap-1">
                <span className="text-2xl font-bold text-[var(--pd-mint)]">
                  {statusResponse?.strengths_count ?? 0}
                </span>
                <span className="text-xs font-medium text-[var(--pd-text-body)]">Verified Strengths</span>
              </div>
            </div>

            {/* AI Status Explanation Banner */}
            {statusResponse?.ai_status === "completed" && (
              <div className="p-3 rounded-xl bg-[var(--pd-ai-wash)] border border-[var(--pd-ai)]/20 flex items-center gap-2.5 text-xs text-[var(--pd-ai)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--pd-ai)] flex-shrink-0" />
                <span>Deeper AI review included.</span>
              </div>
            )}

            {statusResponse?.ai_status === "unavailable" && (
              <div className="p-3 rounded-xl bg-[var(--pd-ai-wash)] border border-[var(--pd-ai)]/20 flex items-start gap-2.5 text-xs text-[var(--pd-ai)]">
                <Info className="w-3.5 h-3.5 text-[var(--pd-ai)] flex-shrink-0 mt-0.5" />
                <span>
                  Core evaluation completed. The deeper AI review wasn't available this time, so the findings are based on verified project evidence and deterministic checks.
                </span>
              </div>
            )}

            {/* Primary Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] rounded-xl transition-colors"
              >
                Dismiss
              </button>

              <button
                type="button"
                onClick={onReviewFindings}
                className="px-5 py-2.5 text-xs font-medium bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)] rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <span>Review Findings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 3. INTERRUPTED STATE */}
        {/* ------------------------------------------------------------------ */}
        {isInterrupted && (
          <div className="flex flex-col gap-5 py-2">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--pd-amber-wash)] border border-[var(--pd-amber)]/20 flex items-center justify-center flex-shrink-0 text-[var(--pd-amber)]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 id="modal-title" className="text-xl font-semibold text-[var(--pd-text-primary)] tracking-tight">
                  Evaluation Stopped
                </h2>
                <p className="text-sm text-[var(--pd-text-body)] mt-1">
                  The evaluation stopped before it finished. You can safely try again.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-xs text-[var(--pd-text-body)]">
              The backend process restarted during active execution. No data was corrupted, and you can re-run the evaluation immediately.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] rounded-xl transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={onRetry}
                className="px-5 py-2.5 text-xs font-medium bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)] rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 4. FAILED STATE */}
        {/* ------------------------------------------------------------------ */}
        {isFailed && (
          <div className="flex flex-col gap-5 py-2">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--pd-coral-wash)] border border-[var(--pd-coral)]/20 flex items-center justify-center flex-shrink-0 text-[var(--pd-coral)]">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 id="modal-title" className="text-xl font-semibold text-[var(--pd-text-primary)] tracking-tight">
                  Evaluation Could Not Complete
                </h2>
                <p className="text-sm text-[var(--pd-text-body)] mt-1">
                  {statusResponse?.message || "An unexpected error occurred during evaluation. You can safely try again."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] rounded-xl transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={onRetry}
                className="px-5 py-2.5 text-xs font-medium bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)] rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 5. INSUFFICIENT EVIDENCE STATE */}
        {/* ------------------------------------------------------------------ */}
        {isInsufficient && (
          <div className="flex flex-col gap-5 py-2">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--pd-amber-wash)] border border-[var(--pd-amber)]/20 flex items-center justify-center flex-shrink-0 text-[var(--pd-amber)]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 id="modal-title" className="text-xl font-semibold text-[var(--pd-text-primary)] tracking-tight">
                  Prerequisites Missing
                </h2>
                <p className="text-sm text-[var(--pd-text-body)] mt-1">
                  {statusResponse?.message || "Project Doctor needs documentation and a connected repository to evaluate your project."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-medium bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)] rounded-xl transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
