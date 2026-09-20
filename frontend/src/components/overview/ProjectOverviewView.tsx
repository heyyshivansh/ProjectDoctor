import React, { useState } from "react";
import {
  FileText,
  Github,
  Sparkles,
  Stethoscope,
  ArrowRight,
  Calendar,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { motion } from "motion/react";
import { ProjectDetail } from "@/types/project";
import { RepositoryConnection } from "@/types/repository";
import { ProjectUnderstanding } from "@/types/understanding";
import { ProjectDiagnosis } from "@/types/diagnosis";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectOverviewViewProps {
  project: ProjectDetail;
  repoConnection: RepositoryConnection | null;
  understanding: ProjectUnderstanding | null;
  diagnosis: ProjectDiagnosis | null;
  onNavigate: (tab: string) => void;
  onGenerateUnderstanding: () => void;
  isGeneratingUnderstanding?: boolean;
}

export const ProjectOverviewView: React.FC<ProjectOverviewViewProps> = ({
  project,
  repoConnection,
  understanding,
  diagnosis,
  onNavigate,
  onGenerateUnderstanding,
  isGeneratingUnderstanding = false,
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const hasUnderstanding = Boolean(understanding && understanding.status === "completed");
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

  return (
    <div className="space-y-5 text-left animate-in fade-in duration-200">
      {/* ─── 1. ALIVE PROJECT HERO (Compact & Responsive) ─── */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.18 }}
        className="group relative bg-[var(--pd-surface)] border border-[var(--pd-border)] hover:border-[var(--pd-border-hover)] rounded-2xl p-6 sm:p-7 space-y-3 transition-colors shadow-pd-card"
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

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-sans font-semibold text-[var(--pd-text-primary)] tracking-tight">
            {project.title}
          </h1>
          <p className="text-sm sm:text-base font-sans text-[var(--pd-text-body)] leading-relaxed max-w-4xl line-clamp-2">
            {project.description || project.problem_statement || "No project overview provided."}
          </p>
        </div>
      </motion.div>

      {/* ─── 2. HORIZONTAL EVIDENCE SPECIMEN RAIL (4 Cards Across Desktop) ─── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
            Evidence Collected &bull; Ground Truth Rail
          </h2>
          <span className="text-[11px] font-mono text-[var(--pd-text-muted)]">
            Click to inspect evidence details
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Documentation Evidence */}
          <motion.div
            whileHover={{ y: -5, scale: 1.015 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => setHoveredCard("docs")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onNavigate("understand")}
            className={cn(
              "group cursor-pointer bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-5 flex flex-col justify-between min-h-[190px] transition-all duration-200",
              "hover:border-[var(--pd-ai)]/40 hover:shadow-pd-glow-violet",
              hoveredCard && hoveredCard !== "docs" ? "opacity-70" : "opacity-100"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-ai)]">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-[var(--pd-text-muted)]">
                  {project.artifacts?.length || 0} attached
                </span>
              </div>

              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                  01 / Documentation
                </h3>
                <p className="text-base font-semibold text-[var(--pd-text-primary)] mt-1">
                  {project.artifacts?.length || 0} Specification Documents
                </p>
                <p className="text-xs text-[var(--pd-text-body)] mt-1 line-clamp-2">
                  {project.artifacts && project.artifacts.length > 0
                    ? project.artifacts.map((a) => a.original_filename).slice(0, 2).join(", ")
                    : "No uploaded specification documents."}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)] group-hover:text-[var(--pd-text-primary)] transition-colors">
              <span>Explore evidence</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 2: Codebase Connection */}
          <motion.div
            whileHover={{ y: -5, scale: 1.015 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => setHoveredCard("repo")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => {
              if (repoConnection?.repo_url) {
                window.open(repoConnection.repo_url, "_blank");
              } else {
                onNavigate("diagnosis");
              }
            }}
            className={cn(
              "group cursor-pointer bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-5 flex flex-col justify-between min-h-[190px] transition-all duration-200",
              "hover:border-[var(--pd-border-hover)] hover:shadow-pd-card",
              hoveredCard && hoveredCard !== "repo" ? "opacity-70" : "opacity-100"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-text-muted)] group-hover:text-[var(--pd-text-primary)] transition-colors">
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
                <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                  02 / Codebase
                </h3>
                <p className="text-base font-semibold text-[var(--pd-text-primary)] mt-1 truncate">
                  {repoConnection ? `${repoConnection.owner}/${repoConnection.repo_name}` : "No repository linked"}
                </p>
                <p className="text-xs text-[var(--pd-text-body)] mt-1">
                  {repoConnection?.current_snapshot
                    ? `${repoConnection.current_snapshot.total_files} files • commit ${repoConnection.current_snapshot.commit_sha.slice(0, 7)}`
                    : "Connect GitHub repository to evaluate code."}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)] group-hover:text-[var(--pd-text-primary)] transition-colors">
              <span>{repoConnection ? "View on GitHub" : "Connect repo"}</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 3: Project Understanding */}
          <motion.div
            whileHover={{ y: -5, scale: 1.015 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => setHoveredCard("understand")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onNavigate("understand")}
            className={cn(
              "group cursor-pointer bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-5 flex flex-col justify-between min-h-[190px] transition-all duration-200",
              "hover:border-[var(--pd-ai)]/40 hover:shadow-pd-glow-violet",
              hoveredCard && hoveredCard !== "understand" ? "opacity-70" : "opacity-100"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-ai)]">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span
                  className={cn(
                    "text-xs font-mono px-2 py-0.5 rounded-full border",
                    hasUnderstanding
                      ? "bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] border-[var(--pd-mint)]/30"
                      : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-border)]"
                  )}
                >
                  {hasUnderstanding ? "Synthesized" : "Not synthesized"}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                  03 / Understanding
                </h3>
                <p className="text-base font-semibold text-[var(--pd-text-primary)] mt-1">
                  {hasUnderstanding ? "Scope Established" : "Scope Pending"}
                </p>
                <p className="text-xs text-[var(--pd-text-body)] mt-1">
                  {hasUnderstanding && understanding
                    ? `${understanding.modules?.length || 0} capabilities • ${understanding.total_words_analyzed.toLocaleString()} words`
                    : "Synthesize scope from project documentation."}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)] group-hover:text-[var(--pd-text-primary)] transition-colors">
              <span>Explore story</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 4: Diagnostic Evaluation */}
          <motion.div
            whileHover={{ y: -5, scale: 1.015 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => setHoveredCard("diagnosis")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => onNavigate("diagnosis")}
            className={cn(
              "group cursor-pointer bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-5 flex flex-col justify-between min-h-[190px] transition-all duration-200",
              "hover:border-[var(--pd-coral)]/40 hover:shadow-pd-glow-coral",
              hoveredCard && hoveredCard !== "diagnosis" ? "opacity-70" : "opacity-100"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-coral)]">
                  <Stethoscope className="w-4 h-4" />
                </span>
                <span
                  className={cn(
                    "text-xs font-mono px-2 py-0.5 rounded-full border",
                    hasDiagnosis && diagnosis
                      ? diagnosis.status === "looks_solid"
                        ? "bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] border-[var(--pd-mint)]/30"
                        : "bg-[var(--pd-amber-wash)] text-[var(--pd-amber)] border-[var(--pd-amber)]/30"
                      : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-border)]"
                  )}
                >
                  {hasDiagnosis && diagnosis ? diagnosis.status_label : "Not analyzed"}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                  04 / Diagnosis
                </h3>
                <p className="text-base font-semibold text-[var(--pd-text-primary)] mt-1">
                  {hasDiagnosis && diagnosis ? `${diagnosis.top_findings?.length || 0} Findings` : "Pending Evaluation"}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-mono">
                  {hasDiagnosis && diagnosis ? (
                    <>
                      {diagnosis.critical_count > 0 && (
                        <span className="text-[var(--pd-coral)]">{diagnosis.critical_count} critical</span>
                      )}
                      {diagnosis.strengths_count > 0 && (
                        <span className="text-[var(--pd-mint)]">• {diagnosis.strengths_count} verified</span>
                      )}
                    </>
                  ) : (
                    <span className="text-[var(--pd-text-muted)]">Re-evaluate to compare claims</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)] group-hover:text-[var(--pd-text-primary)] transition-colors">
              <span>View findings</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── 3. DOMINANT NEXT ACTION CARD (Visually Focused) ─── */}
      <div className="bg-[var(--pd-surface)] border border-[var(--pd-ai)]/30 rounded-2xl p-6 sm:p-7 border-l-4 border-l-[var(--pd-ai)] space-y-3 shadow-pd-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-ai)] font-semibold">
              Next Recommended Action
            </span>
            <h3 className="text-lg sm:text-xl font-sans font-semibold text-[var(--pd-text-primary)]">
              {!hasUnderstanding
                ? "Synthesize Project Scope"
                : hasDiagnosis
                ? "Inspect Critical Evaluation Findings"
                : "Explore Project Understanding"}
            </h3>
            <p className="text-xs sm:text-sm font-sans text-[var(--pd-text-body)] max-w-3xl leading-relaxed">
              {!hasUnderstanding
                ? "Extract core purpose, target audience, and claimed capabilities from your uploaded documents to establish Project Doctor's understanding."
                : hasDiagnosis
                ? "Project Doctor evaluated your claims against codebase evidence. Address critical concerns before your final jury evaluation."
                : "Your project scope is established. Explore what Project Doctor understands about your system boundaries."}
            </p>
          </div>

          <div className="shrink-0">
            {!hasUnderstanding ? (
              <Button
                onClick={onGenerateUnderstanding}
                disabled={isGeneratingUnderstanding}
                className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg shadow-sm"
              >
                {isGeneratingUnderstanding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Synthesize Scope
                  </>
                )}
              </Button>
            ) : hasDiagnosis ? (
              <Button
                onClick={() => onNavigate("diagnosis")}
                className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg shadow-sm"
              >
                <span>View Findings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                onClick={() => onNavigate("understand")}
                className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-5 py-2.5 rounded-lg shadow-sm"
              >
                <span>Explore Understanding</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewView;
