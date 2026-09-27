import React from "react";
import { Users, Boxes, Layers, Cpu, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { ProjectDetail } from "@/types/project";
import { ProjectUnderstanding } from "@/types/understanding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectUnderstandingSummaryCardProps {
  understanding: ProjectUnderstanding | null;
  project: ProjectDetail;
  onExploreUnderstanding: () => void;
  onGenerateUnderstanding?: () => void;
  isGeneratingUnderstanding?: boolean;
}

export const ProjectUnderstandingSummaryCard: React.FC<ProjectUnderstandingSummaryCardProps> = ({
  understanding,
  project,
  onExploreUnderstanding,
  onGenerateUnderstanding,
  isGeneratingUnderstanding = false,
}) => {
  const hasUnderstanding = Boolean(understanding && understanding.status === "completed");

  if (!hasUnderstanding) {
    return (
      <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 space-y-4 shadow-pd-card text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--pd-ai)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Project Scope Synthesis</span>
            </div>
            <h3 className="text-lg font-sans font-semibold text-[var(--pd-text-primary)]">
              Project scope has not been synthesized yet
            </h3>
            <p className="text-sm font-sans text-[var(--pd-text-body)] max-w-2xl leading-relaxed">
              Synthesize what Project Doctor understands about your system boundaries, intended audience, and capabilities from your project documents.
            </p>
          </div>

          {onGenerateUnderstanding && (
            <Button
              onClick={onGenerateUnderstanding}
              disabled={isGeneratingUnderstanding}
              className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg shrink-0 shadow-sm"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isGeneratingUnderstanding && "animate-spin")} />
              <span>{isGeneratingUnderstanding ? "Synthesizing Scope..." : "Synthesize Scope"}</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const targetUsers = understanding?.target_users || [];
  const capabilities = understanding?.modules || [];
  const techStack =
    understanding?.tech_stack?.length
      ? understanding.tech_stack
      : project.tech_stack || [];
  const architecture =
    understanding?.architecture_overview ||
    project.architecture_summary ||
    "Component architecture documented in project specifications.";
  const documentCount =
    understanding?.source_artifact_ids?.length || project.artifacts?.length || 0;

  return (
    <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 space-y-6 shadow-pd-card text-left">
      {/* Header Eyebrow */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--pd-border)] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--pd-ai)] font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>What Project Doctor Understands</span>
        </div>
        <span className="text-xs font-mono text-[var(--pd-text-muted)]">
          Synthesized from project metadata &amp; {documentCount} document{documentCount === 1 ? "" : "s"}
        </span>
      </div>

      {/* 4-Block Executive Understanding Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Block 1: Target Audience */}
        <div className="bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] rounded-xl p-4 space-y-2 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[var(--pd-ai)]" />
              Target Audience
            </span>
            {targetUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {targetUsers.slice(0, 3).map((user, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-[var(--pd-surface-overlay)] border border-[var(--pd-border)] text-xs font-sans text-[var(--pd-text-primary)]"
                  >
                    {user}
                  </span>
                ))}
                {targetUsers.length > 3 && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-[var(--pd-text-muted)]">
                    +{targetUsers.length - 3} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs font-sans text-[var(--pd-text-body)] italic">
                General audience or not specified in documents.
              </p>
            )}
          </div>
          <span className="text-[11px] font-mono text-[var(--pd-text-muted)] pt-2 border-t border-[var(--pd-border)]/50">
            {targetUsers.length} identified persona{targetUsers.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Block 2: Core Capabilities */}
        <div className="bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] rounded-xl p-4 space-y-2 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-[var(--pd-ai)]" />
              Core Capabilities
            </span>
            {capabilities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {capabilities.slice(0, 2).map((cap, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-[var(--pd-surface-overlay)] border border-[var(--pd-border)] text-xs font-sans text-[var(--pd-text-primary)] truncate max-w-full"
                    title={cap}
                  >
                    {cap}
                  </span>
                ))}
                {capabilities.length > 2 && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-[var(--pd-text-muted)]">
                    +{capabilities.length - 2} more capabilities
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs font-sans text-[var(--pd-text-body)] italic">
                Capabilities extracted from documents.
              </p>
            )}
          </div>
          <span className="text-[11px] font-mono text-[var(--pd-text-muted)] pt-2 border-t border-[var(--pd-border)]/50">
            {capabilities.length} claimed capability module{capabilities.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Block 3: Architecture Topology */}
        <div className="bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] rounded-xl p-4 space-y-2 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--pd-ai)]" />
              Architecture
            </span>
            <p className="text-xs font-sans text-[var(--pd-text-primary)] line-clamp-3 leading-relaxed">
              {architecture}
            </p>
          </div>
          <span className="text-[11px] font-mono text-[var(--pd-text-muted)] pt-2 border-t border-[var(--pd-border)]/50">
            Documented system design
          </span>
        </div>

        {/* Block 4: Technology Stack */}
        <div className="bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] rounded-xl p-4 space-y-2 flex flex-col justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[var(--pd-ai)]" />
              Technology Stack
            </span>
            {techStack.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {techStack.slice(0, 4).map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-[var(--pd-surface-overlay)] border border-[var(--pd-border)] text-xs font-mono text-[var(--pd-text-primary)]"
                  >
                    {tech}
                  </span>
                ))}
                {techStack.length > 4 && (
                  <span className="px-1.5 py-0.5 text-[11px] font-mono text-[var(--pd-text-muted)]">
                    +{techStack.length - 4}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs font-sans text-[var(--pd-text-body)] italic">
                Detected from repository or documents.
              </p>
            )}
          </div>
          <span className="text-[11px] font-mono text-[var(--pd-text-muted)] pt-2 border-t border-[var(--pd-border)]/50">
            {techStack.length} runtime tool{techStack.length === 1 ? "" : "s"} &amp; libraries
          </span>
        </div>
      </div>

      {/* Footer Navigation Action */}
      <div className="pt-2 flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--pd-text-muted)] hidden sm:inline">
          Inspect capability details, target user personas, and source document citations
        </span>
        <button
          type="button"
          onClick={onExploreUnderstanding}
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[var(--pd-ai)] hover:text-white transition-colors ml-auto group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)] rounded"
        >
          <span>Explore Detailed Capabilities &amp; Evidence</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
