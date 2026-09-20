import React from "react";
import { RequirementMetrics } from "@/types/requirement";
import { TraceabilityMetrics } from "@/types/traceability";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Loader2,
  FileCheck,
} from "lucide-react";

interface RequirementSummaryHeaderProps {
  metrics: RequirementMetrics | null;
  traceabilityMetrics: TraceabilityMetrics | null;
  hasRepository: boolean;
  activeCommitSha?: string | null;
  isExtracting: boolean;
  isGeneratingTraceability: boolean;
  onExtract: (forceRegenerate?: boolean) => void;
  onGenerateTraceability: () => void;
}

export const RequirementSummaryHeader: React.FC<RequirementSummaryHeaderProps> = ({
  metrics,
  traceabilityMetrics,
  hasRepository,
  activeCommitSha,
  isExtracting,
  isGeneratingTraceability,
  onExtract,
  onGenerateTraceability,
}) => {
  const total = metrics?.total ?? 0;
  const functional = metrics?.by_category?.functional ?? 0;
  const security = metrics?.by_category?.security ?? 0;
  const performance = metrics?.by_category?.performance ?? 0;
  const ambiguous = metrics?.ambiguous_count ?? 0;

  const candidateWithTests = traceabilityMetrics?.candidate_with_tests_count ?? 0;
  const candidate = traceabilityMetrics?.candidate_count ?? 0;
  const unmatched = traceabilityMetrics?.unmatched_count ?? 0;
  const coverage = traceabilityMetrics?.coverage_percentage ?? 0;

  return (
    <div className="space-y-4 text-left">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--pd-hairline)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[var(--pd-accent)]" />
            <h2 className="text-xl font-display font-medium text-[var(--pd-text-primary)] tracking-tight">
              Specification & Traceability Explorer
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-sans text-[var(--pd-text-muted)] mt-1">
            Answers: <span className="text-[var(--pd-text-primary)] italic">"What was the project supposed to do?"</span> — atomic requirements extracted from project documentation and traced to code.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExtract(false)}
            disabled={isExtracting}
            className="text-xs font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)] text-[var(--pd-text-primary)] hover:bg-[var(--pd-hairline)]"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-[var(--pd-accent)]" />
                Extracting...
              </>
            ) : (
              <>
                <FileCheck className="h-3.5 w-3.5 mr-1.5 text-[var(--pd-accent)]" />
                Extract Requirements
              </>
            )}
          </Button>

          {hasRepository && (
            <Button
              size="sm"
              onClick={onGenerateTraceability}
              disabled={isGeneratingTraceability || total === 0}
              className="text-xs font-mono bg-[var(--pd-accent)] text-white hover:bg-[var(--pd-accent-hover)] font-medium"
            >
              {isGeneratingTraceability ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Tracing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Generate Traceability
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-hairline)]">
          <div className="text-[11px] font-mono text-[var(--pd-text-muted)] uppercase tracking-wider">Total Requirements</div>
          <div className="text-2xl font-display font-medium text-[var(--pd-text-primary)] mt-0.5">{total}</div>
          <div className="text-[10px] font-mono text-[var(--pd-text-muted)] mt-1">
            {functional} func · {security} sec · {performance} perf{ambiguous > 0 ? ` · ${ambiguous} ambig` : ""}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-hairline)]">
          <div className="text-[11px] font-mono text-[var(--pd-text-muted)] uppercase tracking-wider">Traced with Tests</div>
          <div className="text-2xl font-display font-medium text-[#10B981] mt-0.5">{candidateWithTests}</div>
          <div className="text-[10px] font-mono text-[var(--pd-text-muted)] mt-1">Verified implementation</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-hairline)]">
          <div className="text-[11px] font-mono text-[var(--pd-text-muted)] uppercase tracking-wider">Code Only</div>
          <div className="text-2xl font-display font-medium text-[#F59E0B] mt-0.5">{candidate}</div>
          <div className="text-[10px] font-mono text-[var(--pd-text-muted)] mt-1">
            {unmatched > 0 ? `${unmatched} unmatched` : "Pending test match"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-hairline)]">
          <div className="text-[11px] font-mono text-[var(--pd-text-muted)] uppercase tracking-wider">Trace Coverage</div>
          <div className="text-2xl font-display font-medium text-[var(--pd-text-primary)] mt-0.5">
            {hasRepository ? `${coverage}%` : "N/A"}
          </div>
          <div className="text-[10px] font-mono text-[var(--pd-text-muted)] mt-1">
            {hasRepository && activeCommitSha ? `Commit ${activeCommitSha.slice(0, 7)}` : "Connect repository"}
          </div>
        </div>
      </div>
    </div>
  );
};
