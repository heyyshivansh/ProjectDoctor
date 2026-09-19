import React from "react";
import { ProjectDiagnosis } from "@/types/diagnosis";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  GitCommit,
  ArrowRight,
} from "lucide-react";

interface DiagnosisHeroSummaryProps {
  diagnosis: ProjectDiagnosis | null;
  isGenerating: boolean;
  onReevaluate: () => void;
  onNavigateToSubsystem?: (tab: "overview" | "understanding" | "requirements" | "repository") => void;
}

export const DiagnosisHeroSummary: React.FC<DiagnosisHeroSummaryProps> = ({
  diagnosis,
  isGenerating,
  onReevaluate,
  onNavigateToSubsystem,
}) => {
  if (!diagnosis) {
    return null;
  }

  // Handle unanalyzed state
  if (diagnosis.status === "not_analyzed") {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {diagnosis.status_label || "Diagnosis Not Generated"}
              </h2>
            </div>
            <p className="text-sm text-slate-700 max-w-2xl leading-relaxed">
              {diagnosis.summary ||
                "Project Doctor has not diagnosed this project yet. Trigger evaluation to analyze requirements, repository code alignment, testing coverage, and potential risks."}
            </p>
          </div>

          <Button
            onClick={onReevaluate}
            disabled={isGenerating}
            size="lg"
            className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Evaluating Project...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run Project Diagnosis
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Handle not_enough_evidence_yet state
  if (diagnosis.status === "not_enough_evidence_yet") {
    const isTraceabilityPending =
      diagnosis.status_label.toLowerCase().includes("traceability") ||
      diagnosis.summary.toLowerCase().includes("traceability");

    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-amber-100 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-amber-950">
                {diagnosis.status_label || "Evidence Needed for Diagnosis"}
              </h2>
            </div>
            <p className="text-sm text-slate-700 max-w-2xl leading-relaxed">
              {diagnosis.summary}
            </p>

            {isTraceabilityPending && onNavigateToSubsystem && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToSubsystem("requirements")}
                  className="gap-1.5 text-xs font-semibold text-amber-900 border-amber-300 hover:bg-amber-100"
                >
                  Go to Requirements & Traceability
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={onReevaluate}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100 font-medium"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Re-check Status
          </Button>
        </div>
      </div>
    );
  }

  // Normal evaluated state styling
  const isSignificantConcern = diagnosis.status === "significant_concern";
  const isNeedsAttention = diagnosis.status === "needs_attention";

  const bannerTheme = isSignificantConcern
    ? "border-rose-200 bg-rose-50/60 text-rose-950"
    : isNeedsAttention
    ? "border-amber-200 bg-amber-50/60 text-amber-950"
    : "border-emerald-200 bg-emerald-50/60 text-emerald-950";

  const iconTheme = isSignificantConcern
    ? "bg-rose-100 text-rose-700"
    : isNeedsAttention
    ? "bg-amber-100 text-amber-700"
    : "bg-emerald-100 text-emerald-700";

  const badgeTheme = isSignificantConcern
    ? "bg-rose-600 text-white"
    : isNeedsAttention
    ? "bg-amber-600 text-white"
    : "bg-emerald-600 text-white";

  return (
    <div className={`rounded-xl border p-6 md:p-8 shadow-sm transition-all ${bannerTheme}`}>
      <div className="flex flex-col gap-6">
        {/* Top bar: Status badge & Re-evaluate Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-lg shadow-sm ${iconTheme}`}>
              {isSignificantConcern ? (
                <AlertCircle className="h-6 w-6" />
              ) : isNeedsAttention ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Project Diagnosis
                </span>
                <Badge className={`text-xs font-semibold px-2.5 py-0.5 ${badgeTheme}`}>
                  {diagnosis.status_label}
                </Badge>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {isSignificantConcern
                  ? "Items detected that require attention before project evaluation"
                  : isNeedsAttention
                  ? "Actionable items identified to improve evaluation readiness"
                  : "Evidence indicates solid engineering practices across evaluated areas"}
              </p>
            </div>
          </div>

          <Button
            onClick={onReevaluate}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="gap-2 shrink-0 bg-white hover:bg-slate-50 text-slate-700 border-slate-300 font-medium shadow-sm self-start sm:self-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                Re-evaluating...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Re-evaluate Project
              </>
            )}
          </Button>
        </div>

        {/* Narrative Summary Paragraph */}
        <div className="text-sm text-slate-700 leading-relaxed max-w-3xl">
          {diagnosis.summary}
        </div>

        {/* Metric indicator chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60">
          {diagnosis.critical_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              {diagnosis.critical_count} Critical Concern{diagnosis.critical_count > 1 ? "s" : ""}
            </span>
          )}

          {diagnosis.major_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              {diagnosis.major_count} Major Gap{diagnosis.major_count > 1 ? "s" : ""}
            </span>
          )}

          {diagnosis.needs_attention_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
              {diagnosis.needs_attention_count} Needs Attention
            </span>
          )}

          {diagnosis.improvements_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              {diagnosis.improvements_count} Improvement Opportunity{diagnosis.improvements_count > 1 ? "ies" : "y"}
            </span>
          )}

          {diagnosis.strengths_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {diagnosis.strengths_count} Verified Strength{diagnosis.strengths_count > 1 ? "s" : ""}
            </span>
          )}

          {diagnosis.commit_sha && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-white/70 px-2.5 py-1 rounded-full border border-slate-200 ml-auto">
              <GitCommit className="h-3 w-3 text-slate-400" />
              Commit {diagnosis.commit_sha.slice(0, 7)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
