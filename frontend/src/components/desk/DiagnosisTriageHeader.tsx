import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { ProjectDiagnosis } from '@/types/diagnosis';
import { AnalysisStatusResponse } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface DiagnosisTriageHeaderProps {
  diagnosis: ProjectDiagnosis | null;
  analysisStatus?: AnalysisStatusResponse | null;
  onReanalyze?: () => void;
}

export function DiagnosisTriageHeader({
  diagnosis,
  analysisStatus,
  onReanalyze,
}: DiagnosisTriageHeaderProps) {
  const criticalCount = diagnosis?.critical_count ?? 0;
  const majorCount = diagnosis?.major_count ?? 0;
  const needsAttentionCount = diagnosis?.needs_attention_count ?? 0;
  const attentionTotal = majorCount + needsAttentionCount;
  const strengthsCount = diagnosis?.strengths_count ?? 0;

  const isStale = analysisStatus?.is_stale;
  const isAiUnavailable = analysisStatus?.ai_status === "unavailable";

  return (
    <div className="space-y-3 pb-2 border-b border-[var(--pd-border)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-sans font-semibold tracking-tight text-[var(--pd-text-primary)]">
            WHAT NEEDS ATTENTION
          </h1>
          <p className="text-xs font-mono text-[var(--pd-text-muted)] mt-0.5">
            Identified technical risks, evaluation gaps, and verified engineering claims.
          </p>
        </div>

        {diagnosis && (
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border",
                criticalCount > 0
                  ? "bg-[var(--pd-coral-wash)] text-[var(--pd-coral)] border-[var(--pd-coral)]/30"
                  : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-border)]"
              )}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{criticalCount} Critical</span>
            </div>

            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border",
                attentionTotal > 0
                  ? "bg-[var(--pd-amber-wash)] text-[var(--pd-amber)] border-[var(--pd-amber)]/30"
                  : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-border)]"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{attentionTotal} Attention</span>
            </div>

            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border",
                strengthsCount > 0
                  ? "bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] border-[var(--pd-mint)]/30"
                  : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-border)]"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{strengthsCount} Verified</span>
            </div>
          </div>
        )}
      </div>

      {/* Stale evaluation notice */}
      {isStale && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--pd-amber-wash)] border border-[var(--pd-amber)]/20 text-xs font-mono text-[var(--pd-amber)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--pd-amber)] shrink-0" />
            <span>
              {analysisStatus?.stale_reason || "New commits or project changes detected since your last evaluation."}
            </span>
          </div>
          {onReanalyze && (
            <button
              onClick={onReanalyze}
              className="ml-3 px-3 py-1 bg-[var(--pd-amber-wash)] hover:bg-[var(--pd-amber-wash)] text-[var(--pd-amber)] border border-[var(--pd-amber)]/30 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Re-analyze</span>
            </button>
          )}
        </div>
      )}

      {/* AI degradation notice */}
      {isAiUnavailable && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-xs font-mono text-[var(--pd-text-muted)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--pd-amber)] shrink-0" />
          <span>
            Core deterministic evaluation is active. AI interpretation was temporarily unavailable during this evaluation.
          </span>
        </div>
      )}
    </div>
  );
}

export default DiagnosisTriageHeader;
