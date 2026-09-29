import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw,
  Sparkles,
  Users,
  Layers,
  Cpu,
  Boxes,
  HelpCircle,
  ShieldAlert,
  Server,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectDetail } from "@/types/project";
import type { ProjectUnderstanding } from "@/types/understanding";
import { FocusedCapabilityExplorer } from "./FocusedCapabilityExplorer";

export interface ProjectUnderstandViewProps {
  project: ProjectDetail;
  understanding: ProjectUnderstanding | null;
  isGenerating: boolean;
  error: string | null;
  onGenerateUnderstanding: () => void;
  onInspectArtifact?: (artifactId: string) => void;
  onOpenAnalysis?: () => void;
}

type SceneKey = "capabilities" | "audience" | "architecture";

const SCENES: { key: SceneKey; label: string; number: string; icon: React.ElementType }[] = [
  { key: "capabilities", label: "Core Capabilities", number: "01", icon: Boxes },
  { key: "audience", label: "Target Audience", number: "02", icon: Users },
  { key: "architecture", label: "Architecture & Stack", number: "03", icon: Layers },
];

export function ProjectUnderstandView({
  project,
  understanding,
  isGenerating,
  error,
  onGenerateUnderstanding,
  onInspectArtifact,
  onOpenAnalysis,
}: ProjectUnderstandViewProps) {
  const [activeScene, setActiveScene] = useState<SceneKey>("capabilities");

  // Keyboard navigation: 1-3, ArrowLeft, ArrowRight
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
      ) {
        return;
      }

      if (e.key === "1") setActiveScene("capabilities");
      else if (e.key === "2") setActiveScene("audience");
      else if (e.key === "3") setActiveScene("architecture");
      else if (e.key === "ArrowLeft") {
        const idx = SCENES.findIndex((s) => s.key === activeScene);
        if (idx > 0) setActiveScene(SCENES[idx - 1].key);
      } else if (e.key === "ArrowRight") {
        const idx = SCENES.findIndex((s) => s.key === activeScene);
        if (idx < SCENES.length - 1) setActiveScene(SCENES[idx + 1].key);
      }
    },
    [activeScene]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // EMPTY STATE (When understanding has not been generated)
  if (!understanding) {
    return (
      <div className="w-full py-8 text-center">
        <div className="max-w-2xl mx-auto p-8 sm:p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] shadow-pd-card space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--pd-ai-wash)] border border-[var(--pd-ai)]/20 flex items-center justify-center mx-auto text-[var(--pd-ai)]">
            <Sparkles className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-sans font-semibold text-[var(--pd-text-primary)]">
              Project scope has not been synthesized yet
            </h2>
            <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed max-w-lg mx-auto">
              Synthesize what Project Doctor understands about your system boundaries, intended audience, and claimed capabilities from your uploaded project specifications.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[var(--pd-coral-wash)] border border-[var(--pd-coral)]/30 text-[var(--pd-coral)] text-xs font-mono text-left max-w-md mx-auto">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={onGenerateUnderstanding}
              disabled={isGenerating}
              className="gap-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono px-6 py-2.5 rounded-lg shadow-sm"
            >
              <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
              <span>{isGenerating ? "Synthesizing Scope..." : "Generate Understanding"}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Hero headline
  const heroText =
    understanding.problem ||
    project.problem_statement ||
    project.description ||
    "Software platform for verified technical project requirements.";
  const specCount = understanding.source_artifact_ids?.length || project.artifacts?.length || 0;
  const userProvList: any[] = Array.isArray(understanding.provenance?.target_users)
    ? understanding.provenance.target_users
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-left">
      {/* ─── 1. COMPACT UNDERSTANDING HERO ─── */}
      <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 space-y-3 shadow-pd-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--pd-ai)] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--pd-ai)]" />
            <span>Project Scope &bull; What You&apos;re Building</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateUnderstanding}
            disabled={isGenerating}
            className="border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] hover:border-[var(--pd-border-hover)] bg-[var(--pd-surface-raised)] text-xs font-mono h-8 shrink-0"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isGenerating && "animate-spin text-[var(--pd-ai)]")} />
            <span>{isGenerating ? "Refreshing..." : "Refresh Understanding"}</span>
          </Button>
        </div>

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-sans font-semibold text-[var(--pd-text-primary)] tracking-tight leading-snug line-clamp-3">
          {heroText}
        </h1>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-[var(--pd-text-muted)] border-t border-[var(--pd-border)]">
          <span>Synthesized from project metadata &amp; {specCount} specification document{specCount === 1 ? "" : "s"}</span>
          {understanding.total_words_analyzed > 0 && (
            <>
              <span>&bull;</span>
              <span>{understanding.total_words_analyzed.toLocaleString()} words analyzed</span>
            </>
          )}
        </div>
      </div>

      {/* ─── 2. SCENE NAVIGATION SWITCHER ─── */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--pd-border)] pb-3">
        <nav aria-label="Understanding scene navigation" className="flex items-center gap-2">
          {SCENES.map((scene) => {
            const isActive = activeScene === scene.key;
            const SceneIcon = scene.icon;

            return (
              <button
                key={scene.key}
                type="button"
                onClick={() => setActiveScene(scene.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]",
                  isActive
                    ? "bg-[var(--pd-surface-raised)] text-[var(--pd-text-primary)] border border-[var(--pd-border-hover)] shadow-sm font-semibold"
                    : "text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)]/50"
                )}
              >
                <span className={cn("text-[11px]", isActive ? "text-[var(--pd-ai)] font-bold" : "text-[var(--pd-text-faint)]")}>
                  {scene.number}
                </span>
                <SceneIcon className="w-3.5 h-3.5" />
                <span>{scene.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[var(--pd-text-muted)]">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--pd-surface-raised)] border border-[var(--pd-border)]">1-3</kbd>
          <span>or</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--pd-surface-raised)] border border-[var(--pd-border)]">&larr;</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--pd-surface-raised)] border border-[var(--pd-border)]">&rarr;</kbd>
          <span>to switch scene</span>
        </div>
      </div>

      {/* ─── 3. INTERACTIVE SCENE SURFACE ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeScene}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="min-h-[380px]"
        >
          {/* SCENE 1: CAPABILITIES (FOCUSED EXPLORER) */}
          {activeScene === "capabilities" && (
            <FocusedCapabilityExplorer
              modules={understanding.modules || []}
              requirementsSummary={understanding.requirements_summary}
              provenance={understanding.provenance}
              artifacts={project.artifacts || []}
              onInspectArtifact={onInspectArtifact}
            />
          )}

          {/* SCENE 2: TARGET AUDIENCE */}
          {activeScene === "audience" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
                  Target Audience &amp; Beneficiaries
                </span>
                <span className="text-xs font-mono text-[var(--pd-text-muted)]">
                  {understanding.target_users?.length || 0} identified persona{understanding.target_users?.length === 1 ? "" : "s"}
                </span>
              </div>

              {understanding.target_users && understanding.target_users.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {understanding.target_users.map((user, idx) => {
                    // Match document citation for this persona
                    const prov = userProvList.find(
                      (p) => String(p.value).trim().toLowerCase() === String(user).trim().toLowerCase()
                    );
                    const matchedArt = prov?.artifact_id
                      ? (project.artifacts || []).find((a) => a.id === prov.artifact_id)
                      : null;

                    return (
                      <div
                        key={idx}
                        className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 flex flex-col justify-between min-h-[220px] shadow-pd-card"
                      >
                        <div className="space-y-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-ai)]">
                            <Users className="w-5 h-5" />
                          </div>

                          <div className="space-y-1">
                            <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                              Persona {idx + 1}
                            </span>
                            <h3 className="text-lg font-semibold text-[var(--pd-text-primary)] leading-tight">
                              {user}
                            </h3>
                          </div>

                          <p className="text-xs font-sans text-[var(--pd-text-body)] leading-relaxed">
                            Intended operator or beneficiary identified from project documentation.
                          </p>
                        </div>

                        <div className="pt-3 border-t border-[var(--pd-border)] space-y-2">
                          {prov ? (
                            <div className="flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)]">
                              <span className="truncate max-w-[180px]" title={matchedArt?.original_filename || "Specification"}>
                                Source: {matchedArt?.original_filename || "Specification"}
                              </span>
                              {prov.artifact_id && onInspectArtifact && (
                                <button
                                  type="button"
                                  onClick={() => onInspectArtifact(prov.artifact_id)}
                                  className="text-[var(--pd-ai)] hover:text-white transition-colors flex items-center gap-1 shrink-0"
                                >
                                  <span>View</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-[var(--pd-text-muted)]">
                              Source: Project description
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 sm:p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2.5 text-[var(--pd-amber)]">
                    <HelpCircle className="w-5 h-5" />
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--pd-text-primary)]">
                      Target audience is not clearly defined yet
                    </h3>
                  </div>
                  <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
                    Project Doctor could not identify specific user classes or intended beneficiaries from your supplied documents.
                  </p>
                  <p className="text-xs font-mono text-[var(--pd-text-muted)] pt-2 border-t border-[var(--pd-border)]">
                    Tip: Add a dedicated &quot;User Classes &amp; Characteristics&quot; section to your SRS to ground technical evaluation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SCENE 3: ARCHITECTURE & TECHNOLOGY */}
          {activeScene === "architecture" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
                  Documented System Architecture &amp; Technology Stack
                </span>
                <span className="text-xs font-mono text-[var(--pd-text-muted)]">
                  Evidence-backed structure
                </span>
              </div>

              {understanding.architecture_overview || project.architecture_summary ? (
                <div className="space-y-4">
                  {/* Architecture Topology Statement */}
                  <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 space-y-3 shadow-pd-card">
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--pd-text-muted)] uppercase tracking-wider font-semibold">
                      <Server className="w-4 h-4 text-[var(--pd-ai)]" />
                      <span>Documented System Architecture</span>
                    </div>

                    <p className="text-base font-sans text-[var(--pd-text-body)] leading-relaxed">
                      {understanding.architecture_overview || project.architecture_summary}
                    </p>
                  </div>

                  {/* Discrete Dependencies & Hosting if Available */}
                  {(understanding.dependencies?.length > 0 || understanding.deployment) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {understanding.dependencies && understanding.dependencies.length > 0 && (
                        <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-xl p-5 space-y-2">
                          <span className="text-xs font-mono text-[var(--pd-text-muted)] uppercase tracking-wider">
                            Documented Dependencies &amp; External Services
                          </span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {understanding.dependencies.map((dep, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-xs font-mono text-[var(--pd-text-primary)]"
                              >
                                {dep}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {understanding.deployment && (
                        <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-xl p-5 space-y-2">
                          <span className="text-xs font-mono text-[var(--pd-text-muted)] uppercase tracking-wider">
                            Hosting &amp; Deployment Target
                          </span>
                          <p className="text-sm font-sans text-[var(--pd-text-body)] pt-1">
                            {understanding.deployment}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Technology Stack Grid */}
                  <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 space-y-3 shadow-pd-card">
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--pd-text-muted)] uppercase tracking-wider font-semibold">
                      <Cpu className="w-4 h-4 text-[var(--pd-ai)]" />
                      <span>Detected Technology Stack</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {(understanding.tech_stack?.length
                        ? understanding.tech_stack
                        : project.tech_stack || []
                      ).map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-xs font-mono text-[var(--pd-text-primary)] font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 sm:p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2.5 text-[var(--pd-amber)]">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--pd-text-primary)]">
                      Architecture topology is not explicitly detailed
                    </h3>
                  </div>
                  <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
                    Project Doctor could not locate an explicit architectural topology or component relationship map in your uploaded documents.
                  </p>
                  <p className="text-xs font-mono text-[var(--pd-text-muted)] pt-2 border-t border-[var(--pd-border)]">
                    Tip: Add a system architecture section or component diagram description to your project documentation.
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── 4. BOTTOM FORWARD CALL TO ACTION ─── */}
      {onOpenAnalysis && (
        <div className="pt-4 border-t border-[var(--pd-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 shadow-pd-card">
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-[var(--pd-text-primary)]">
              Ready to verify these claims against code?
            </h4>
            <p className="text-xs sm:text-sm text-[var(--pd-text-body)]">
              Run technical analysis to compare stated capabilities and audience requirements with repository implementation evidence.
            </p>
          </div>

          <Button
            onClick={onOpenAnalysis}
            className="gap-2 bg-[var(--pd-ai)] text-white hover:bg-[var(--pd-ai-hover)] text-xs font-mono px-5 py-2.5 rounded-lg font-medium shadow-sm shrink-0 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analyze Project</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default ProjectUnderstandView;
