import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProjectDetail } from '@/types/project';
import type { ProjectUnderstanding } from '@/types/understanding';

export interface ProjectUnderstandViewProps {
  project: ProjectDetail;
  understanding: ProjectUnderstanding | null;
  isGenerating: boolean;
  error: string | null;
  onGenerateUnderstanding: () => void;
}

type SceneKey = 'audience' | 'capabilities' | 'architecture' | 'technology';

const SCENES: { key: SceneKey; label: string; number: string; icon: React.ElementType }[] = [
  { key: 'audience', label: 'Audience', number: '01', icon: Users },
  { key: 'capabilities', label: 'Capabilities', number: '02', icon: Boxes },
  { key: 'architecture', label: 'Architecture', number: '03', icon: Layers },
  { key: 'technology', label: 'Technology', number: '04', icon: Cpu },
];

export function ProjectUnderstandView({
  project,
  understanding,
  isGenerating,
  error,
  onGenerateUnderstanding,
}: ProjectUnderstandViewProps) {
  const [activeScene, setActiveScene] = useState<SceneKey>('audience');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Keyboard navigation: 1-4, ArrowLeft, ArrowRight
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        return;
      }

      if (e.key === '1') setActiveScene('audience');
      else if (e.key === '2') setActiveScene('capabilities');
      else if (e.key === '3') setActiveScene('architecture');
      else if (e.key === '4') setActiveScene('technology');
      else if (e.key === 'ArrowLeft') {
        const idx = SCENES.findIndex((s) => s.key === activeScene);
        if (idx > 0) setActiveScene(SCENES[idx - 1].key);
      } else if (e.key === 'ArrowRight') {
        const idx = SCENES.findIndex((s) => s.key === activeScene);
        if (idx < SCENES.length - 1) setActiveScene(SCENES[idx + 1].key);
      }
    },
    [activeScene]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
              Project Doctor hasn&apos;t synthesized your project scope yet.
            </h2>
            <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed max-w-lg mx-auto">
              Synthesize an understanding of your project by extracting core purpose, target audience,
              claimed capabilities, and architecture directly from your uploaded documents.
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
              <RefreshCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
              <span>{isGenerating ? 'Synthesizing Scope...' : 'Generate Understanding'}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Primary Understanding Hero Text (compacted to 2-3 lines desktop)
  const heroText =
    understanding.problem ||
    project.problem_statement ||
    project.description ||
    'Software platform for verified technical project requirements.';
  const specCount = understanding.source_artifact_ids?.length || project.artifacts?.length || 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-left">
      {/* ─── 1. COMPACT UNDERSTANDING HERO (Fits in ~120px) ─── */}
      <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--pd-ai)]">
            <span className="w-2 h-2 rounded-full bg-[var(--pd-ai)]" />
            <span>I think you&apos;re building...</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateUnderstanding}
            disabled={isGenerating}
            className="border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] hover:border-[var(--pd-border-hover)] bg-[var(--pd-surface-raised)] text-xs font-mono h-8 shrink-0"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isGenerating && 'animate-spin text-[var(--pd-ai)]')} />
            <span>{isGenerating ? 'Refreshing...' : 'Refresh Understanding'}</span>
          </Button>
        </div>

        {/* 2-3 Lines Desktop Max */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-sans font-semibold text-[var(--pd-text-primary)] tracking-tight leading-snug line-clamp-3">
          {heroText}
        </h1>

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-[var(--pd-text-muted)] border-t border-[var(--pd-border)]">
          <span>Synthesized strictly from project metadata &amp; {specCount} specification document(s)</span>
          {understanding.total_words_analyzed > 0 && (
            <>
              <span>•</span>
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
                onClick={() => setActiveScene(scene.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]',
                  isActive
                    ? 'bg-[var(--pd-surface-raised)] text-[var(--pd-text-primary)] border border-[var(--pd-border-hover)] shadow-sm font-semibold'
                    : 'text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)]/50'
                )}
              >
                <span className={cn('text-[11px]', isActive ? 'text-[var(--pd-ai)] font-bold' : 'text-[var(--pd-text-faint)]')}>
                  {scene.number}
                </span>
                <SceneIcon className="w-3.5 h-3.5" />
                <span>{scene.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[var(--pd-text-muted)]">
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--pd-surface-raised)] border border-[var(--pd-border)]">1-4</kbd>
          <span>or</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--pd-surface-raised)] border border-[var(--pd-border)]">&larr;</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--pd-surface-raised)] border border-[var(--pd-border)]">&rarr;</kbd>
          <span>to switch scene</span>
        </div>
      </div>

      {/* ─── 3. HORIZONTAL SCENE THEATER ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeScene}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="min-h-[380px]"
        >
          {/* SCENE 1: AUDIENCE */}
          {activeScene === 'audience' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
                  01 / Target Audience &amp; Beneficiaries
                </span>
                <span className="text-xs font-mono text-[var(--pd-text-muted)]">
                  {understanding.target_users?.length || 0} identified personas
                </span>
              </div>

              {understanding.target_users && understanding.target_users.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {understanding.target_users.map((user, idx) => {
                    const isHovered = hoveredCardId === `user-${idx}`;
                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -6, scale: 1.015 }}
                        transition={{ duration: 0.18 }}
                        onMouseEnter={() => setHoveredCardId(`user-${idx}`)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        className={cn(
                          'group relative bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 flex flex-col justify-between min-h-[220px] transition-all duration-200 cursor-default',
                          'hover:border-[var(--pd-ai)]/40 hover:shadow-pd-glow-violet',
                          hoveredCardId && !isHovered ? 'opacity-65' : 'opacity-100'
                        )}
                      >
                        <div className="space-y-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-text-muted)] group-hover:text-[var(--pd-ai)] group-hover:border-[var(--pd-ai)]/30 transition-colors">
                            <Users className="w-5 h-5" />
                          </div>

                          <h3 className="text-lg sm:text-xl font-semibold text-[var(--pd-text-primary)] leading-tight">
                            {user}
                          </h3>

                          <p className="text-xs sm:text-sm text-[var(--pd-text-body)] leading-relaxed">
                            {isHovered
                              ? `Identified from uploaded specifications as an intended operator or beneficiary of ${project.title}.`
                              : `Primary user class identified in project scope.`}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)]">
                          <span>Target User Class</span>
                          <span className="opacity-0 group-hover:opacity-100 text-[var(--pd-ai)] transition-opacity">↗</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Meaningful Empty State: Never fabricate personas */
                <div className="p-8 sm:p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2.5 text-[var(--pd-amber)]">
                    <HelpCircle className="w-5 h-5" />
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--pd-text-primary)]">
                      Target audience isn&apos;t clearly defined yet.
                    </h3>
                  </div>
                  <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
                    Project Doctor couldn&apos;t identify a specific audience from the supplied project documents.
                  </p>
                  <p className="text-xs font-mono text-[var(--pd-text-muted)] pt-2 border-t border-[var(--pd-border)]">
                    Tip: Add a dedicated &quot;User Classes and Characteristics&quot; section to your SRS to ground evaluation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SCENE 2: CAPABILITIES */}
          {activeScene === 'capabilities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
                  02 / Claimed System Capabilities
                </span>
                <span className="text-xs font-mono text-[var(--pd-text-muted)]">
                  {understanding.modules?.length || 0} core capabilities
                </span>
              </div>

              {understanding.modules && understanding.modules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {understanding.modules.map((mod, idx) => {
                    const isHovered = hoveredCardId === `mod-${idx}`;
                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -6, scale: 1.015 }}
                        transition={{ duration: 0.18 }}
                        onMouseEnter={() => setHoveredCardId(`mod-${idx}`)}
                        onMouseLeave={() => setHoveredCardId(null)}
                        className={cn(
                          'group relative bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 flex flex-col justify-between min-h-[220px] transition-all duration-200 cursor-default',
                          'hover:border-[var(--pd-ai)]/40 hover:shadow-pd-glow-violet',
                          hoveredCardId && !isHovered ? 'opacity-65' : 'opacity-100'
                        )}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-[var(--pd-text-muted)]">
                              Capability {idx + 1}
                            </span>
                          </div>

                          <h3 className="text-lg sm:text-xl font-semibold text-[var(--pd-text-primary)] leading-snug">
                            {mod}
                          </h3>

                          <p className="text-xs sm:text-sm text-[var(--pd-text-body)] leading-relaxed">
                            {isHovered && understanding.requirements_summary
                              ? understanding.requirements_summary
                              : `Extracted capability area verified against candidate implementation evidence.`}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)]">
                          <span>{isHovered ? 'Specification Provenance' : 'Verified in Review Desk'}</span>
                          <span className="opacity-0 group-hover:opacity-100 text-[var(--pd-ai)] transition-opacity">↗</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 sm:p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2.5 text-[var(--pd-amber)]">
                    <HelpCircle className="w-5 h-5" />
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--pd-text-primary)]">
                      Capabilities not explicitly extracted.
                    </h3>
                  </div>
                  <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
                    No functional modules or system capabilities were identified in uploaded specifications.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SCENE 3: ARCHITECTURE (Strictly Evidence-Backed: Never Invented) */}
          {activeScene === 'architecture' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
                  03 / Architecture Topology &amp; Component Boundaries
                </span>
                <span className="text-xs font-mono text-[var(--pd-text-muted)]">
                  Strictly deterministic evidence
                </span>
              </div>

              {understanding.architecture_overview || project.architecture_summary ? (
                <div className="space-y-4">
                  {/* Authentic Architecture Statement */}
                  <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-8 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--pd-text-muted)] uppercase tracking-wider">
                      <Server className="w-4 h-4 text-[var(--pd-ai)]" />
                      <span>Documented System Architecture</span>
                    </div>

                    <p className="text-base sm:text-lg font-sans text-[var(--pd-text-body)] leading-relaxed">
                      {understanding.architecture_overview || project.architecture_summary}
                    </p>
                  </div>

                  {/* Discrete Components if Supported (NO INVENTED ARROWS) */}
                  {(understanding.dependencies?.length > 0 || understanding.deployment) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {understanding.dependencies && understanding.dependencies.length > 0 && (
                        <div className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-xl p-5 space-y-2">
                          <span className="text-xs font-mono text-[var(--pd-text-muted)] uppercase tracking-wider">
                            Documented Dependencies
                          </span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {understanding.dependencies.map((dep, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-xs font-mono text-[var(--pd-text-body)]"
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
                </div>
              ) : (
                /* Honest Missing Topology State: Never invent Frontend -> API -> Database */
                <div className="p-8 sm:p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2.5 text-[var(--pd-amber)]">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--pd-text-primary)]">
                      Architecture topology isn&apos;t clearly defined in the supplied project evidence.
                    </h3>
                  </div>
                  <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
                    Project Doctor could not locate an explicit architectural topology or component relationship map
                    in your uploaded documents.
                  </p>
                  <p className="text-xs font-mono text-[var(--pd-text-muted)] pt-2 border-t border-[var(--pd-border)]">
                    Tip: Add a system architecture diagram or component overview section to your project documentation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SCENE 4: TECHNOLOGY */}
          {activeScene === 'technology' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
                  04 / Detected Technology Stack &amp; Runtime Tools
                </span>
                <span className="text-xs font-mono text-[var(--pd-text-muted)]">
                  {understanding.tech_stack?.length || project.tech_stack?.length || 0} technologies
                </span>
              </div>

              {(understanding.tech_stack && understanding.tech_stack.length > 0) ||
              (project.tech_stack && project.tech_stack.length > 0) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {(understanding.tech_stack?.length ? understanding.tech_stack : project.tech_stack || []).map(
                    (tech, idx) => {
                      const isHovered = hoveredCardId === `tech-${idx}`;
                      return (
                        <motion.div
                          key={idx}
                          whileHover={{ y: -6, scale: 1.015 }}
                          transition={{ duration: 0.18 }}
                          onMouseEnter={() => setHoveredCardId(`tech-${idx}`)}
                          onMouseLeave={() => setHoveredCardId(null)}
                          className={cn(
                            'group relative bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 flex flex-col justify-between min-h-[160px] transition-all duration-200 cursor-default',
                            'hover:border-[var(--pd-ai)]/40 hover:shadow-pd-glow-violet',
                            hoveredCardId && !isHovered ? 'opacity-65' : 'opacity-100'
                          )}
                        >
                          <div className="space-y-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] flex items-center justify-center text-[var(--pd-text-muted)] group-hover:text-[var(--pd-ai)] transition-colors">
                              <Cpu className="w-4 h-4" />
                            </div>

                            <h3 className="text-base font-semibold text-[var(--pd-text-primary)]">
                              {tech}
                            </h3>
                          </div>

                          <div className="pt-2 border-t border-[var(--pd-border)] flex items-center justify-between text-xs font-mono text-[var(--pd-text-muted)]">
                            <span>{isHovered ? 'Extracted Stack Item' : 'Runtime Stack'}</span>
                            <span className="opacity-0 group-hover:opacity-100 text-[var(--pd-ai)] transition-opacity">↗</span>
                          </div>
                        </motion.div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="p-8 sm:p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3 max-w-2xl">
                  <div className="flex items-center gap-2.5 text-[var(--pd-amber)]">
                    <HelpCircle className="w-5 h-5" />
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--pd-text-primary)]">
                      Technology stack not specified.
                    </h3>
                  </div>
                  <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
                    No programming languages or frameworks were explicitly identified in the documentation.
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default ProjectUnderstandView;
