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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2c303a]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#d4924f]" />
            <h2 className="text-xl font-display font-medium text-[#f2efe9] tracking-tight">
              Specification & Traceability Explorer
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-sans text-[#c4c8d0] mt-1">
            Answers: <span className="text-[#f2efe9] italic">"What was the project supposed to do?"</span> — atomic requirements extracted from project documentation and traced to code.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExtract(false)}
            disabled={isExtracting}
            className="text-xs font-mono bg-[#181a1f] border-[#2c303a] text-[#f2efe9] hover:bg-[#20232a]"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-[#d4924f]" />
                Extracting...
              </>
            ) : (
              <>
                <FileCheck className="h-3.5 w-3.5 mr-1.5 text-[#d4924f]" />
                Extract Requirements
              </>
            )}
          </Button>

          {hasRepository && (
            <Button
              size="sm"
              onClick={onGenerateTraceability}
              disabled={isGeneratingTraceability || total === 0}
              className="text-xs font-mono bg-[#d4924f] text-[#111317] hover:bg-[#e2a15f] font-medium"
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
        <div className="p-3.5 rounded-xl bg-[#181a1f] border border-[#2c303a]">
          <div className="text-[11px] font-mono text-[#888e9b] uppercase tracking-wider">Total Requirements</div>
          <div className="text-2xl font-display font-medium text-[#f2efe9] mt-0.5">{total}</div>
          <div className="text-[10px] font-mono text-[#5a606e] mt-1">
            {functional} func · {security} sec · {performance} perf{ambiguous > 0 ? ` · ${ambiguous} ambig` : ""}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#181a1f] border border-[#2c303a]">
          <div className="text-[11px] font-mono text-[#888e9b] uppercase tracking-wider">Traced with Tests</div>
          <div className="text-2xl font-display font-medium text-[#56b68b] mt-0.5">{candidateWithTests}</div>
          <div className="text-[10px] font-mono text-[#5a606e] mt-1">Verified implementation</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#181a1f] border border-[#2c303a]">
          <div className="text-[11px] font-mono text-[#888e9b] uppercase tracking-wider">Code Only</div>
          <div className="text-2xl font-display font-medium text-[#e5a84b] mt-0.5">{candidate}</div>
          <div className="text-[10px] font-mono text-[#5a606e] mt-1">
            {unmatched > 0 ? `${unmatched} unmatched` : "Pending test match"}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#181a1f] border border-[#2c303a]">
          <div className="text-[11px] font-mono text-[#888e9b] uppercase tracking-wider">Trace Coverage</div>
          <div className="text-2xl font-display font-medium text-[#f2efe9] mt-0.5">
            {hasRepository ? `${coverage}%` : "N/A"}
          </div>
          <div className="text-[10px] font-mono text-[#5a606e] mt-1">
            {hasRepository && activeCommitSha ? `Commit ${activeCommitSha.slice(0, 7)}` : "Connect repository"}
          </div>
        </div>
      </div>
    </div>
  );
};
