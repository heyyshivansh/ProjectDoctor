import React, { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileSearch,
  ChevronDown,
  Sparkles,
  Layers,
} from "lucide-react";
import { FindingSummary, FindingDetail, FindingSeverity } from "@/types/diagnosis";
import { cn } from "@/lib/utils";

interface KeyFindingPagerProps {
  findings: FindingSummary[];
  activeIndex: number;
  onSelectFinding: (index: number) => void;
  findingDetail: FindingDetail | null;
  onOpenEvidence: () => void;
}

const severityConfig: Record<
  FindingSeverity,
  { icon: React.ElementType; badgeClasses: string; label: string }
> = {
  critical: {
    icon: AlertCircle,
    badgeClasses: "bg-[var(--pd-coral-wash)] text-[var(--pd-coral)] border-[var(--pd-coral)]/30",
    label: "Critical Concern",
  },
  major: {
    icon: AlertTriangle,
    badgeClasses: "bg-[var(--pd-amber-wash)] text-[var(--pd-amber)] border-[var(--pd-amber)]/30",
    label: "Major Issue",
  },
  needs_attention: {
    icon: AlertCircle,
    badgeClasses: "bg-[var(--pd-amber-wash)] text-[var(--pd-amber)] border-[var(--pd-amber)]/30",
    label: "Needs Attention",
  },
  improvement: {
    icon: ArrowUpRight,
    badgeClasses: "bg-[var(--pd-ai-wash)] text-[var(--pd-ai)] border-[var(--pd-ai)]/30",
    label: "Suggested Improvement",
  },
  strength: {
    icon: CheckCircle2,
    badgeClasses: "bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] border-[var(--pd-mint)]/30",
    label: "Verified Strength",
  },
};

export const KeyFindingPager: React.FC<KeyFindingPagerProps> = ({
  findings,
  activeIndex,
  onSelectFinding,
  findingDetail,
  onOpenEvidence,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const total = findings.length;
  const activeFinding = findings[activeIndex] || null;
  const prevFinding = activeIndex > 0 ? findings[activeIndex - 1] : null;
  const nextFinding = activeIndex < total - 1 ? findings[activeIndex + 1] : null;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && activeIndex > 0) {
        e.preventDefault();
        onSelectFinding(activeIndex - 1);
      } else if (e.key === "ArrowRight" && activeIndex < total - 1) {
        e.preventDefault();
        onSelectFinding(activeIndex + 1);
      }
    },
    [activeIndex, total, onSelectFinding]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setShowTechnicalDetails(false);
  }, [activeIndex]);

  if (!activeFinding) return null;

  const config =
    severityConfig[activeFinding.severity] || severityConfig.needs_attention;
  const SeverityIcon = config.icon;

  const whyItMatters =
    activeFinding.why_it_matters || findingDetail?.why_it_matters;
  const suggestedAction =
    activeFinding.suggested_action || findingDetail?.suggested_action;
  const evidenceCount =
    findingDetail?.evidence_references?.length ??
    (findingDetail?.hydrated_evidence?.length || 0);

  return (
    <section
      role="region"
      aria-label="Key Findings Investigation"
      className="space-y-3"
    >
      {/* Investigation Track Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--pd-ai)]" />
            Active Investigation Focus
          </span>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-[var(--pd-text-muted)]">
            Finding {activeIndex + 1} of {total}
          </span>
        </div>

        {/* Prev / Next Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onSelectFinding(activeIndex - 1)}
            disabled={activeIndex === 0}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono transition-colors",
              activeIndex === 0
                ? "border-[var(--pd-border)] text-[var(--pd-text-faint)] cursor-not-allowed bg-transparent"
                : "border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] hover:border-[var(--pd-border-hover)]"
            )}
            title={prevFinding ? `Previous: ${prevFinding.title}` : undefined}
            aria-label="Previous finding"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <button
            onClick={() => onSelectFinding(activeIndex + 1)}
            disabled={activeIndex === total - 1}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono transition-colors",
              activeIndex === total - 1
                ? "border-[var(--pd-border)] text-[var(--pd-text-faint)] cursor-not-allowed bg-transparent"
                : "border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] hover:border-[var(--pd-border-hover)]"
            )}
            title={nextFinding ? `Next: ${nextFinding.title}` : undefined}
            aria-label="Next finding"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dominant Finding Surface (Viewport-budgeted) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFinding.id || activeIndex}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-8 shadow-pd-card space-y-5"
        >
          {/* LEVEL 1: WHAT IS WRONG? + HOW SERIOUS IS IT? */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border",
                  config.badgeClasses
                )}
              >
                <SeverityIcon className="w-3.5 h-3.5" />
                <span>{config.label}</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-[var(--pd-text-primary)] leading-snug tracking-tight">
              {activeFinding.title}
            </h2>

            <p className="text-base sm:text-lg font-sans text-[var(--pd-text-body)] leading-relaxed">
              {activeFinding.summary}
            </p>
          </div>

          {/* LEVEL 2: WHY DOES IT MATTER? */}
          {whyItMatters && (
            <div className="border-l-2 border-[var(--pd-ai)]/40 pl-4 py-1 space-y-1 bg-[var(--pd-canvas-subtle)]/40 rounded-r-lg">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
                Why This Matters For Evaluation
              </span>
              <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
                {whyItMatters}
              </p>
            </div>
          )}

          {/* LEVEL 3: WHAT SHOULD I DO? */}
          {suggestedAction && (
            <div className="p-4 rounded-xl bg-[var(--pd-amber-wash)] border border-[var(--pd-amber)]/20 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[var(--pd-amber)] mt-0.5 shrink-0" />
              <div className="space-y-0.5 text-sm">
                <span className="font-mono uppercase tracking-wider text-[var(--pd-amber)] font-semibold block text-xs">
                  Recommended Action
                </span>
                <p className="text-[var(--pd-text-primary)] font-sans leading-relaxed text-sm">
                  {suggestedAction}
                </p>
              </div>
            </div>
          )}

          {/* LEVEL 5: WHAT EVIDENCE PROVES IT? + LEVEL 6: TECHNICAL DETAILS (COLLAPSIBLE) */}
          <div className="pt-3 border-t border-[var(--pd-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex items-center gap-1.5 text-xs font-mono text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)] rounded"
              aria-expanded={showTechnicalDetails}
            >
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform",
                  showTechnicalDetails && "rotate-180"
                )}
              />
              <span>
                {showTechnicalDetails
                  ? "Hide technical metadata & rule codes"
                  : "View technical metadata & rule codes"}
              </span>
            </button>

            <button
              onClick={onOpenEvidence}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)] shrink-0"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>
                Inspect Source Evidence{" "}
                {evidenceCount > 0 ? `(${evidenceCount} refs)` : ""} &rarr;
              </span>
            </button>
          </div>

          {/* LEVEL 6: COLLAPSIBLE TECHNICAL DRAWER */}
          {showTechnicalDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-xl bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] space-y-2 text-xs font-mono text-[var(--pd-text-muted)]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                <span className="font-medium text-[var(--pd-text-body)]">Finding Hash:</span>
                <span className="sm:col-span-2 select-all truncate text-[var(--pd-text-muted)]">
                  {activeFinding.finding_hash}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                <span className="font-medium text-[var(--pd-text-body)]">Rule Code:</span>
                <span className="sm:col-span-2 text-[var(--pd-text-body)]">
                  {findingDetail?.technical_details?.rule_code || activeFinding.finding_type}
                </span>
              </div>
              {activeFinding.commit_sha && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                  <span className="font-medium text-[var(--pd-text-body)]">Commit:</span>
                  <span className="sm:col-span-2 text-[var(--pd-text-body)]">
                    {activeFinding.commit_sha.slice(0, 7)}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Position Navigation Track */}
      <div className="flex items-center justify-center gap-2 pt-1" aria-label="Finding pagination">
        {findings.map((f, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={f.id}
              onClick={() => onSelectFinding(idx)}
              aria-label={`Go to finding ${idx + 1}: ${f.title}`}
              className={cn(
                "h-2 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]",
                isActive
                  ? "w-8 bg-[var(--pd-ai)]"
                  : "w-2.5 bg-[var(--pd-border-hover)] hover:bg-[var(--pd-text-muted)]"
              )}
            />
          );
        })}
      </div>
    </section>
  );
};

export default KeyFindingPager;
