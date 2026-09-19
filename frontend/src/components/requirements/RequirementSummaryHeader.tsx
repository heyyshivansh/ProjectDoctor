import React from "react";
import { RequirementMetrics } from "@/types/requirement";
import { TraceabilityMetrics } from "@/types/traceability";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Loader2,
  GitCommit,
  CheckCircle2,
  HelpCircle,
  XCircle,
  RefreshCw,
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
  const ambiguousTrace = traceabilityMetrics?.ambiguous_count ?? 0;
  const coverage = traceabilityMetrics?.coverage_percentage ?? 0;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Requirements & Implementation Traceability
            </h2>
            {activeCommitSha && (
              <Badge variant="outline" className="font-mono text-[11px] gap-1 text-slate-600 bg-slate-50">
                <GitCommit className="h-3 w-3 text-slate-400" />
                {activeCommitSha.slice(0, 7)}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Connects extracted project requirements to candidate implementation files, route endpoints, and automated tests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExtract(false)}
            disabled={isExtracting}
            className="gap-1.5 text-xs font-medium"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                {total > 0 ? "Re-Extract Requirements" : "Extract Requirements"}
              </>
            )}
          </Button>

          {hasRepository && total > 0 && (
            <Button
              size="sm"
              onClick={onGenerateTraceability}
              disabled={isGeneratingTraceability}
              className="gap-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isGeneratingTraceability ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  Scanning Code...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {traceabilityMetrics && traceabilityMetrics.total_requirements > 0
                    ? "Re-Run Traceability"
                    : "Trace Implementation Code"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Traceability Status Banner if repo connected */}
      {hasRepository && total > 0 && (
        <Card className="border border-slate-200 bg-gradient-to-r from-slate-50 to-white shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Candidate Code Discovery
                </span>
                <Badge
                  variant="outline"
                  className={
                    coverage >= 70
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                      : coverage >= 40
                      ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                      : "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                  }
                >
                  {coverage}% Candidate Discovery
                </Badge>
              </div>
              <p className="text-xs text-slate-600">
                {candidateWithTests + candidate} of {total} requirements have candidate files located in this repository snapshot.
              </p>
              <p className="text-[11px] text-slate-400 italic">
                Shows where potential implementation evidence was located. It does not certify implementation completeness or correctness.
              </p>
            </div>

            {/* Micro-pills for status breakdown */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {candidateWithTests} Candidate Code & Tests Located
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
                {candidate} Candidate Code Located (No Tests)
              </span>
              {ambiguousTrace > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  {ambiguousTrace} Ambiguous Candidate Evidence
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                <XCircle className="h-3.5 w-3.5 text-slate-400" />
                {unmatched} No Candidate Evidence
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Extracted</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{total}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Functional</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{functional}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Security & Perf</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{security + performance}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Ambiguous Specs</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{ambiguous}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
