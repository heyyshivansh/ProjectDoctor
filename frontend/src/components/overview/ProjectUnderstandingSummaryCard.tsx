import React from "react";
import { Users, Boxes, Layers, Cpu, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { ProjectDetail } from "@/types/project";
import { ProjectUnderstanding } from "@/types/understanding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
} from "@/components/motion-primitives/morphing-dialog";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Block 1: Target Audience */}
        <div className="bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-sm font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--pd-ai)]" />
              Target Audience
            </span>
            {targetUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {targetUsers.slice(0, 3).map((user, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-[var(--pd-surface-overlay)] border border-[var(--pd-border)] text-sm font-sans text-[var(--pd-text-primary)]"
                  >
                    {user}
                  </span>
                ))}
                {targetUsers.length > 3 && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono text-[var(--pd-text-muted)] self-center">
                    +{targetUsers.length - 3} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm font-sans text-[var(--pd-text-body)] italic">
                General audience or not specified in documents.
              </p>
            )}
          </div>
        </div>

        {/* Block 2: Core Capabilities */}
        <MorphingDialog>
          <MorphingDialogTrigger className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--pd-ai)] rounded-xl">
            <div className="group bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] hover:border-[var(--pd-border-hover)] hover:bg-[var(--pd-surface-overlay)] transition-colors rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-3">
                <span className="text-sm font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[var(--pd-ai)]" />
                  Core Capabilities
                </span>
                {capabilities.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {capabilities.slice(0, 2).map((cap, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-sm font-sans text-[var(--pd-text-primary)] truncate max-w-full"
                        title={cap}
                      >
                        {cap}
                      </span>
                    ))}
                    {capabilities.length > 2 && (
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono text-[var(--pd-text-muted)] self-center">
                        +{capabilities.length - 2} more capabilities
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-sans text-[var(--pd-text-body)] italic">
                    Capabilities extracted from documents.
                  </p>
                )}
              </div>
              <div className="pt-3 border-t border-[var(--pd-border)]/50 mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[var(--pd-ai)] group-hover:text-[var(--pd-text-primary)] transition-colors">
                  <span>View All Capabilities</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </MorphingDialogTrigger>
          <MorphingDialogContainer>
            <MorphingDialogContent className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-8 space-y-5 shadow-pd-elevated w-[90vw] max-w-2xl text-[var(--pd-text-body)]">
              <MorphingDialogClose className="text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors absolute top-4 right-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)] rounded" />
              <div className="space-y-1 pr-6">
                <h3 className="text-xl font-semibold text-[var(--pd-text-primary)] flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-[var(--pd-ai)]" />
                  Core Capabilities
                </h3>
                <p className="text-sm text-[var(--pd-text-muted)]">Extracted from specification documents</p>
              </div>
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-2">
                {capabilities.map((cap, idx) => (
                  <div key={idx} className="p-3 bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] rounded-lg text-sm text-[var(--pd-text-primary)]">
                    {cap}
                  </div>
                ))}
                {capabilities.length === 0 && (
                  <p className="italic text-[var(--pd-text-muted)]">No capabilities extracted.</p>
                )}
              </div>
              <div className="pt-4 border-t border-[var(--pd-border)] mt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={onExploreUnderstanding}
                  className="inline-flex items-center gap-1.5 text-sm font-mono uppercase tracking-wider text-[var(--pd-ai)] hover:text-[var(--pd-text-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)] rounded"
                >
                  <span>Explore Detailed Capabilities &amp; Evidence</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </MorphingDialogContent>
          </MorphingDialogContainer>
        </MorphingDialog>

        {/* Block 3: Architecture Topology */}
        <div className="bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-sm font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--pd-ai)]" />
              Architecture
            </span>
            <p className="text-sm font-sans text-[var(--pd-text-primary)] line-clamp-4 leading-relaxed">
              {architecture}
            </p>
          </div>
        </div>

        {/* Block 4: Technology Stack */}
        <div className="bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-sm font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--pd-ai)]" />
              Technology Stack
            </span>
            {techStack.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {techStack.slice(0, 6).map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-[var(--pd-surface-overlay)] border border-[var(--pd-border)] text-sm font-mono text-[var(--pd-text-primary)]"
                  >
                    {tech}
                  </span>
                ))}
                {techStack.length > 6 && (
                  <span className="px-2 py-1 text-xs font-mono text-[var(--pd-text-muted)] self-center">
                    +{techStack.length - 6}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm font-sans text-[var(--pd-text-body)] italic">
                Detected from repository or documents.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
