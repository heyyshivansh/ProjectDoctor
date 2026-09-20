import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronLeft, ChevronRight, FileCheck2, ShieldCheck, Zap } from 'lucide-react';
import { FindingSummary } from '@/types/diagnosis';
import { cn } from '@/lib/utils';

interface VerifiedStrengthsShowcaseProps {
  strengths: FindingSummary[];
  onOpenEvidence?: (strength: FindingSummary) => void;
}

export const VerifiedStrengthsShowcase: React.FC<VerifiedStrengthsShowcaseProps> = ({
  strengths,
  onOpenEvidence,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const CARDS_PER_PAGE = 3;
  const totalPages = Math.ceil((strengths?.length || 0) / CARDS_PER_PAGE);

  const extractCapabilityName = (title: string): string => {
    // Strip parenthesized requirement IDs and boilerplate prefixes
    const parenMatch = title.match(/\((.+)\)$/);
    if (parenMatch && parenMatch[1]) {
      const clean = parenMatch[1].replace(/^(REQ|req)[-_]?[A-Za-z0-9]+[:\s-]+/i, '').trim();
      if (clean.length > 0) return clean;
    }
    return title
      .replace(/^(Implementation accompanied by candidate test evidence|Implementation of|Requirement:|Feature:|Capability:|Verified:)\s*/i, '')
      .replace(/REQ-\d+\s*-?\s*/i, '')
      .replace(/[()]/g, '')
      .trim() || title;
  };

  const getVerificationBadge = (type: string) => {
    if (type.includes('architecture') || type.includes('system')) {
      return { icon: ShieldCheck, label: 'Architectural Strength' };
    }
    if (type.includes('performance') || type.includes('optimization')) {
      return { icon: Zap, label: 'Performance Pattern' };
    }
    return { icon: FileCheck2, label: 'Verified Capability' };
  };

  if (!strengths || strengths.length === 0) return null;

  const visibleStrengths = strengths.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE
  );

  return (
    <section role="region" aria-label="Verified Capabilities Showcase" className="space-y-4 pt-2">
      {/* Header with Horizontal Pagination Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--pd-mint)]" />
            What&apos;s Already Working
          </span>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-[var(--pd-mint)]">
            {strengths.length} verified
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--pd-text-muted)]">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-1.5 rounded-lg border border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous strengths page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-1.5 rounded-lg border border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] hover:bg-[var(--pd-surface-raised)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next strengths page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3 Horizontal Cards Visible at Desktop Widths */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {visibleStrengths.map((strength) => {
            const capabilityName = extractCapabilityName(strength.title);
            const { icon: BadgeIcon } = getVerificationBadge(strength.finding_type);
            const isHovered = hoveredId === strength.id;

            return (
              <motion.div
                key={strength.id}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.18 }}
                onMouseEnter={() => setHoveredId(strength.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onOpenEvidence && onOpenEvidence(strength)}
                className={cn(
                  "group relative cursor-pointer bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-xl p-5 flex flex-col justify-between min-h-[170px] transition-all duration-200",
                  "hover:border-[var(--pd-mint)]/40 hover:shadow-pd-glow-mint",
                  hoveredId && !isHovered ? "opacity-70" : "opacity-100"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] text-[11px] font-mono font-medium border border-[var(--pd-mint)]/20">
                      <BadgeIcon className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-[var(--pd-text-primary)] leading-snug tracking-tight">
                    {capabilityName}
                  </h3>

                  {/* Short summary or rationale revealed on hover */}
                  <p className="text-xs text-[var(--pd-text-body)] leading-relaxed line-clamp-2">
                    {isHovered && strength.why_it_matters
                      ? strength.why_it_matters
                      : strength.summary || "Implementation and automated test suite confirmed by deterministic evidence."}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-[11px] font-mono text-[var(--pd-text-muted)] group-hover:text-[var(--pd-mint)] transition-colors">
                  <span>{isHovered ? "Inspect proof →" : "Confirmed by code & tests"}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};

export default VerifiedStrengthsShowcase;
