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
  X
} from "lucide-react";
import { FindingSummary, FindingDetail, FindingSeverity } from "@/types/diagnosis";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogTitle,
  MorphingDialogDescription,
} from "@/components/motion-primitives/morphing-dialog";
import { cn } from "@/lib/utils";

interface KeyFindingPagerProps {
  findings: FindingSummary[];
  activeIndex: number;
  onSelectFinding: (index: number) => void;
  findingDetail: FindingDetail | null;
  
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
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const total = findings.length;
  const activeFinding = findings[activeIndex] || null;
  
  

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

    const renderEvidence = () => {
    if (!findingDetail?.hydrated_evidence || findingDetail.hydrated_evidence.length === 0) {
      return (
        <div className="p-8 bg-[var(--pd-surface)] rounded-xl text-center border border-[var(--pd-border)]">
          <FileSearch className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-[var(--pd-text-muted)]">No source evidence is linked yet.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto pr-2 text-left">
        {findingDetail.hydrated_evidence.map((ev: any, i: number) => (
          <div key={i} className="p-4 bg-[var(--pd-surface)] rounded-xl border border-[var(--pd-border)] text-left">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                {(ev.evidence_type || ev.role || "").replace(/_/g, " ")}
              </span>
              <span className="text-xs font-medium text-[var(--pd-text-muted)] capitalize">
                {(ev.target_type || "").replace(/_/g, " ")}
              </span>
            </div>
            {ev.title && <p className="text-sm font-semibold mb-2">{ev.title}</p>}
            {ev.snippet ? (
              <pre className="p-3 bg-white rounded-lg text-xs font-mono text-gray-800 overflow-x-auto border border-gray-100 whitespace-pre-wrap">
                {ev.snippet}
              </pre>
            ) : null}
            <div className="text-sm text-[var(--pd-text-body)] space-y-2 mt-2 bg-white p-3 rounded-lg border border-gray-100">
              {ev.file_path && <p><strong className="text-gray-900">Path:</strong> {ev.file_path}</p>}
              {ev.section_title && <p><strong className="text-gray-900">Section:</strong> {ev.section_title}</p>}
              {ev.page_number && <p><strong className="text-gray-900">Page:</strong> {ev.page_number}</p>}
              {ev.content_status === "security_omitted" && (
                <p className="text-amber-700 bg-amber-50 p-2 rounded flex items-center gap-2 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Content intentionally omitted for security reasons.
                </p>
              )}
              {ev.line_start && ev.line_end && (
                <p><strong className="text-gray-900">Lines:</strong> {ev.line_start} - {ev.line_end}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

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
      className="space-y-3 pb-32"
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

        
      </div>

      {/* Dominant Finding Surface (Viewport-budgeted) */}
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Previous Button - Left on desktop, Top/Bottom on mobile? Actually let's use order for mobile to put them together at bottom */}
        <button
          onClick={() => onSelectFinding(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous finding"
          className="hidden sm:flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-[var(--pd-surface)] border border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:border-[var(--pd-ai)] hover:bg-[var(--pd-surface-raised)] disabled:opacity-30 disabled:pointer-events-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 w-full min-w-0">
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
          <div className="space-y-3 pb-32">
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
            <div className="border-l-2 border-[var(--pd-ai)]/40 pl-4 py-1 space-y-1 bg-[var(--pd-surface-raised)] rounded-r-lg">
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

            <MorphingDialog transition={{ type: 'spring', bounce: 0, duration: 0.3 }}>
              <MorphingDialogTrigger className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--pd-ai)] hover:bg-[var(--pd-ai-hover)] text-white text-xs font-mono font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)] shrink-0">
                  <FileSearch className="w-3.5 h-3.5" />
                  <span>
                    Inspect Source Evidence{" "}
                    {evidenceCount > 0 ? `(${evidenceCount} refs)` : ""} &rarr;
                  </span>
                </MorphingDialogTrigger>
              <MorphingDialogContainer>
                <MorphingDialogContent className="pointer-events-auto w-full max-w-2xl rounded-2xl bg-[var(--pd-surface)] p-6 shadow-2xl border border-[var(--pd-border)] flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <MorphingDialogTitle className="text-lg font-semibold text-[var(--pd-text-primary)] pr-8">
                      {activeFinding.title}
                    </MorphingDialogTitle>
                    <MorphingDialogClose className="text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] bg-[var(--pd-surface-raised)] hover:bg-[var(--pd-border-hover)] rounded-full p-2 transition-colors shrink-0">
                      <X className="w-4 h-4" />
                    </MorphingDialogClose>
                  </div>
                  <MorphingDialogDescription className="text-sm text-[var(--pd-text-muted)] mb-4">
                    Inspect the source evidence for this finding.
                  </MorphingDialogDescription>
                  {renderEvidence()}
                </MorphingDialogContent>
              </MorphingDialogContainer>
            </MorphingDialog>
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
        </div>

        {/* Next Button - Right on desktop */}
        <button
          onClick={() => onSelectFinding(activeIndex + 1)}
          disabled={activeIndex === total - 1}
          aria-label="Next finding"
          className="hidden sm:flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-[var(--pd-surface)] border border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] hover:border-[var(--pd-ai)] hover:bg-[var(--pd-surface-raised)] disabled:opacity-30 disabled:pointer-events-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* Mobile-only prev/next row (below the card) */}
      <div className="flex sm:hidden items-center justify-between gap-4 mt-2 px-2">
        <button
          onClick={() => onSelectFinding(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous finding"
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] disabled:opacity-30 disabled:pointer-events-none transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Previous</span>
        </button>
        <button
          onClick={() => onSelectFinding(activeIndex + 1)}
          disabled={activeIndex === total - 1}
          aria-label="Next finding"
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[var(--pd-surface)] border border-[var(--pd-border)] text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] disabled:opacity-30 disabled:pointer-events-none transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pd-ai)]"
        >
          <span className="text-sm font-medium">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>


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
