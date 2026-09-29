import React from "react";
import {
  FileText,
  Github,
  Sparkles,
  Stethoscope,
  ArrowRight,
  Calendar,
  Loader2,
  ExternalLink,
  Boxes,
} from "lucide-react";
import { motion } from "motion/react";
import { ProjectDetail } from "@/types/project";
import { RepositoryConnection } from "@/types/repository";
import { ProjectUnderstanding } from "@/types/understanding";
import { ProjectDiagnosis } from "@/types/diagnosis";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnalysisStatusResponse } from "@/types/analysis";
import { ProjectUnderstandingSummaryCard } from "./ProjectUnderstandingSummaryCard";
import { Spotlight } from "@/components/core/spotlight";

interface ProjectOverviewViewProps {
  project: ProjectDetail;
  repoConnection: RepositoryConnection | null;
  understanding: ProjectUnderstanding | null;
  diagnosis: ProjectDiagnosis | null;
  analysisStatus?: AnalysisStatusResponse | null;
  onOpenAnalysis?: () => void;
  onNavigate: (tab: string) => void;
  onGenerateUnderstanding: () => void;
  isGeneratingUnderstanding?: boolean;
  onInspectArtifact?: (artifactId: string) => void;
}

export const ProjectOverviewView: React.FC<ProjectOverviewViewProps> = ({
  project,
  repoConnection,
  understanding,
  diagnosis,
  analysisStatus,
  onOpenAnalysis,
  onNavigate,
  onGenerateUnderstanding,
  isGeneratingUnderstanding = false,
  onInspectArtifact,
}) => {
  const hasDiagnosis = Boolean(
    diagnosis &&
    diagnosis.status !== "not_analyzed" &&
    diagnosis.status !== "not_enough_evidence_yet"
  );

  const formattedDate = project.created_at
    ? new Date(project.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const purposeHeadline =
    understanding?.problem ||
    project.problem_statement ||
    project.description ||
    "Technical project evaluation and verification platform.";

  const artifacts = project.artifacts || [];

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      {/* ─── 1. PROJECT IDENTITY & EVALUATOR STATEMENT HERO ─── */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.18 }}
        className="relative bg-[var(--pd-surface)] border border-[var(--pd-border)] hover:border-[var(--pd-border-hover)] rounded-2xl p-6 sm:p-7 space-y-4 transition-colors shadow-pd-card"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border bg-[var(--pd-surface-raised)] border-[var(--pd-border)] text-[var(--pd-text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--pd-ai)]" />
              <span>Project Identity</span>
            </span>

            {hasDiagnosis && diagnosis && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border",
                  diagnosis.status === "looks_solid"
                    ? "bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] border-[var(--pd-mint)]/30"
                    : "bg-[var(--pd-amber-wash)] text-[var(--pd-amber)] border-[var(--pd-amber)]/30"
                )}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>{diagnosis.status_label}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-[var(--pd-text-muted)]">
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Registered {formattedDate}</span>
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-sans font-semibold text-[var(--pd-text-primary)] tracking-tight">
            {project.title}
          </h1>

          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-semibold">
              Project Purpose &bull; Problem Being Solved
            </span>
            <p className="text-sm sm:text-base font-sans text-[var(--pd-text-body)] leading-relaxed max-w-4xl line-clamp-3">
              {purposeHeadline}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. EXECUTIVE UNDERSTANDING MATRIX (Summary First) ─── */}
      <ProjectUnderstandingSummaryCard
        understanding={understanding}
        project={project}
        onExploreUnderstanding={() => onNavigate("understand")}
        onGenerateUnderstanding={onGenerateUnderstanding}
        isGeneratingUnderstanding={isGeneratingUnderstanding}
      />

      {/* ─── 3. RAW PROJECT MATERIALS VS. EXTRACTED CLAIMS ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
            Project Materials &amp; Extracted Claims
          </h2>
          <span className="text-[11px] font-mono text-[var(--pd-text-muted)]">
            Ground-truth inputs compared with stated scope
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card A: Raw Specification Materials */}
          <div className="relative bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-5 flex flex-col justify-between min-h-[180px] shadow-pd-card">
            <Spotlight size={200} className="blur-2xl" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-ai)]">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-[var(--pd-text-muted)]">
                  {artifacts.length} file{artifacts.length === 1 ? "" : "s"}
                </span>
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                  Provided Documents
                </span>
                <h3 className="text-base font-semibold text-[var(--pd-text-primary)] mt-1">
                  {artifacts.length > 0
                    ? `${artifacts.length} Specification Document${artifacts.length === 1 ? "" : "s"}`
                    : "No Documents Uploaded"}
                </h3>
                <p className="text-xs text-[var(--pd-text-body)] mt-1 line-clamp-2">
                  {artifacts.length > 0
                    ? artifacts.map((a) => a.original_filename).join(", ")
                    : "Upload project proposal or SRS documents to establish verified scope."}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono">
              {artifacts.length > 0 && onInspectArtifact ? (
                <button
                  type="button"
                  onClick={() => onInspectArtifact(artifacts[0].id)}
                  className="text-[var(--pd-ai)] hover:text-[var(--pd-ai-hover)] transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--pd-ai)] rounded"
                >
                  <span>Inspect Extracted Text</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[var(--pd-text-muted)]">Specifications input</span>
              )}
            </div>
          </div>

          {/* Card B: Raw Codebase Connection */}
          <div className="relative bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-5 flex flex-col justify-between min-h-[180px] shadow-pd-card">
            <Spotlight size={200} className="blur-2xl" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-text-muted)]">
                  <Github className="w-4 h-4" />
                </span>
                <span
                  className={cn(
                    "text-xs font-mono px-2 py-0.5 rounded-full border",
                    repoConnection?.current_snapshot
                      ? "bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] border-[var(--pd-mint)]/30"
                      : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-border)]"
                  )}
                >
                  {repoConnection?.current_snapshot ? "Connected & Synced" : "Not connected"}
                </span>
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                  Provided Codebase
                </span>
                <h3 className="text-base font-semibold text-[var(--pd-text-primary)] mt-1 truncate">
                  {repoConnection ? `${repoConnection.owner}/${repoConnection.repo_name}` : "No repository linked"}
                </h3>
                <p className="text-xs text-[var(--pd-text-body)] mt-1">
                  {repoConnection?.current_snapshot
                    ? `${repoConnection.current_snapshot.total_files} files • commit ${repoConnection.current_snapshot.commit_sha.slice(0, 7)}`
                    : "Connect GitHub repository to evaluate code implementation."}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono">
              {repoConnection?.repo_url ? (
                <a
                  href={repoConnection.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] transition-colors flex items-center gap-1"
                >
                  <span>View on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-[var(--pd-text-muted)]">Codebase input</span>
              )}
            </div>
          </div>

          {/* Card C: Derived Stated Claims Ready to Verify */}
          <div className="relative bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-5 flex flex-col justify-between min-h-[180px] shadow-pd-card">
            <Spotlight size={200} className="blur-2xl" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-ai)]">
                  <Boxes className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-[var(--pd-text-muted)]">
                  {understanding?.modules?.length || 0} claims
                </span>
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                  Extracted Claims to Verify
                </span>
                <h3 className="text-base font-semibold text-[var(--pd-text-primary)] mt-1">
                  {understanding?.modules?.length
                    ? `${understanding.modules.length} Stated Capabilities`
                    : "Pending Document Extraction"}
                </h3>
                <p className="text-xs text-[var(--pd-text-body)] mt-1 line-clamp-2">
                  {understanding?.modules?.length
                    ? `Features including ${understanding.modules.slice(0, 3).join(", ")} will be verified against code.`
                    : "Extracted capability claims will be compared with repository evidence during analysis."}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono">
              <button
                type="button"
                onClick={() => onNavigate("understand")}
                className="text-[var(--pd-ai)] hover:text-[var(--pd-ai-hover)] transition-colors flex items-center gap-1 group focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--pd-ai)] rounded"
              >
                <span>Explore Claims</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. DOMINANT NEXT ACTION CARD (Visually Focused) ─── */}
      <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 space-y-3 shadow-pd-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-ai)] font-semibold flex items-center gap-1.5">
              {analysisStatus?.status === "running" && (
                <span className="w-2 h-2 rounded-full bg-[var(--pd-ai)] animate-ping" />
              )}
              {analysisStatus?.status === "running"
                ? "Evaluation In Progress"
                : analysisStatus?.status === "interrupted"
                ? "Evaluation Stopped"
                : analysisStatus?.is_stale
                ? "Stale Evaluation"
                : analysisStatus?.status === "not_started"
                ? "Next Action"
                : hasDiagnosis
                ? "Evaluation Complete"
                : "Next Recommended Action"}
            </span>

            <h3 className="text-lg sm:text-xl font-sans font-semibold text-[var(--pd-text-primary)]">
              {analysisStatus?.status === "running"
                ? "Investigating Your Project"
                : analysisStatus?.status === "interrupted"
                ? "Resume Project Evaluation"
                : analysisStatus?.is_stale
                ? "Re-analyze Project"
                : analysisStatus?.status === "not_started"
                ? "Analyze Project"
                : hasDiagnosis
                ? "Inspect Critical Evaluation Findings"
                : "Analyze Project"}
            </h3>

            <p className="text-xs sm:text-sm font-sans text-[var(--pd-text-body)] max-w-3xl leading-relaxed">
              {analysisStatus?.status === "running"
                ? "Project Doctor is actively comparing your documentation claims with repository code evidence."
                : analysisStatus?.status === "interrupted"
                ? "The evaluation stopped before it finished. You can safely try again."
                : analysisStatus?.is_stale
                ? "New commits or project changes were detected since your last evaluation. Re-run analysis to bring your diagnosis up to date."
                : analysisStatus?.status === "not_started"
                ? "Compare what your project claims with what your documentation and repository can actually demonstrate."
                : hasDiagnosis
                ? "Project Doctor evaluated your claims against codebase evidence. Review what is verified, what is missing, and what needs attention."
                : "Run technical evaluation to compare your stated capabilities against codebase implementation evidence."}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {analysisStatus?.status === "running" ? (
              <Button
                onClick={onOpenAnalysis}
                className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg shadow-sm"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>View Progress</span>
              </Button>
            ) : analysisStatus?.status === "interrupted" ? (
              <Button
                onClick={onOpenAnalysis}
                className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </Button>
            ) : analysisStatus?.is_stale ? (
              <Button
                onClick={onOpenAnalysis}
                className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-analyze Project</span>
              </Button>
            ) : analysisStatus?.status === "not_started" ? (
              <Button
                onClick={onOpenAnalysis}
                className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg font-medium shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze Project</span>
              </Button>
            ) : hasDiagnosis ? (
              <>
                <Button
                  onClick={onOpenAnalysis}
                  variant="outline"
                  className="text-xs font-mono px-3.5 py-2 bg-[var(--pd-surface-raised)] border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)]"
                >
                  <span>Re-analyze</span>
                </Button>
                <Button
                  onClick={() => onNavigate("diagnosis")}
                  className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg shadow-sm"
                >
                  <span>Review Findings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <Button
                onClick={onOpenAnalysis}
                className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg font-medium shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analyze Project</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewView;
