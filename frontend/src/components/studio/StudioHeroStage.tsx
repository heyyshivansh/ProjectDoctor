import React from "react";
import { ProjectDetail } from "@/types/project";
import { ProjectDiagnosis } from "@/types/diagnosis";
import { QualitativeStatusBadge } from "@/components/shared/QualitativeStatusBadge";
import { TactileSurface } from "@/components/shared/TactileSurface";
import { cn } from "@/lib/utils";

interface StudioHeroStageProps {
  project: ProjectDetail;
  diagnosis?: ProjectDiagnosis | null;
  className?: string;
}

/**
 * StudioHeroStage: Level 1 of the Progressive Disclosure Hierarchy.
 * Delivers immediate clarity in Viewport 1: overall qualitative diagnosis verdict,
 * evaluation timestamp, and concise architectural narrative summary.
 */
export const StudioHeroStage: React.FC<StudioHeroStageProps> = ({
  project,
  diagnosis,
  className,
}) => {
  const status = diagnosis?.status || "not_analyzed";

  const formatAnalyzedDate = (dateString?: string | null) => {
    if (!dateString) return "Evaluated recently";
    try {
      const date = new Date(dateString);
      return `Evaluated on ${date.toLocaleDateString()}`;
    } catch {
      return "Evaluated recently";
    }
  };

  return (
    <TactileSurface
      elevation="raised"
      className={cn("p-6 sm:p-8 bg-white border-slate-200/90 space-y-4", className)}
    >
      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <QualitativeStatusBadge status={status} size="md" />

        <span className="text-xs text-slate-400 font-medium">
          {formatAnalyzedDate(diagnosis?.analyzed_at)}
        </span>
      </div>

      {/* Narrative Headline & Summary */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
          {project.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-3xl">
          {diagnosis?.summary ||
            "Technical evaluation across project artifacts and codebase alignment."}
        </p>
      </div>

      {/* Overview Count Chips (Informational only, not clickable filters) */}
      {diagnosis && (
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {diagnosis.critical_count > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-medium">
              {diagnosis.critical_count} Critical
            </span>
          )}
          {diagnosis.major_count > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
              {diagnosis.major_count} Major
            </span>
          )}
          {diagnosis.needs_attention_count > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
              {diagnosis.needs_attention_count} Needs Attention
            </span>
          )}
          {diagnosis.improvements_count > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-medium">
              {diagnosis.improvements_count} Improvements
            </span>
          )}
          {diagnosis.strengths_count > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
              {diagnosis.strengths_count} Confirmed Strengths
            </span>
          )}
        </div>
      )}
    </TactileSurface>
  );
};
