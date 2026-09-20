import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, AlertTriangle, AlertCircle, ArrowUpRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { FindingSummary, FindingSeverity } from '@/types/diagnosis';
import { cn } from '@/lib/utils';

interface HorizontalFindingsRibbonProps {
  findings: FindingSummary[];
  activeIndex: number;
  onSelectFinding: (index: number) => void;
}

const severityConfig: Record<FindingSeverity, { icon: React.ElementType; classes: string; label: string }> = {
  critical: { icon: Flame, classes: 'text-[#F43F5E] bg-[#F43F5E]/12 border-[#F43F5E]/25', label: 'Critical' },
  major: { icon: AlertTriangle, classes: 'text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/25', label: 'Major' },
  needs_attention: { icon: AlertCircle, classes: 'text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/25', label: 'Needs Attention' },
  improvement: { icon: ArrowUpRight, classes: 'text-[#10B981] bg-[#10B981]/12 border-[#10B981]/25', label: 'Improvement' },
  strength: { icon: Sparkles, classes: 'text-[#10B981] bg-[#10B981]/12 border-[#10B981]/25', label: 'Strength' },
};

export function HorizontalFindingsRibbon({ findings, activeIndex, onSelectFinding }: HorizontalFindingsRibbonProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      onSelectFinding(Math.max(0, activeIndex - 1));
    } else if (e.key === 'ArrowRight') {
      onSelectFinding(Math.min(findings.length - 1, activeIndex + 1));
    }
  }, [activeIndex, findings.length, onSelectFinding]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!findings || findings.length === 0) return null;

  return (
    <section 
      role="region" 
      aria-label="Key Findings"
      className="w-full py-6 space-y-6 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 sm:px-6">
        <h2 className="font-display text-lg text-[var(--pd-text-muted)] tracking-widest uppercase">Key Findings</h2>
        <span className="font-mono text-sm text-[var(--pd-text-muted)]">{findings.length} findings</span>
      </div>

      <div className="relative flex items-center justify-center min-h-[220px]">
        {/* Desktop Carousel Layout */}
        <div className="hidden sm:flex items-center justify-center w-full gap-4 relative h-full">
          {findings.map((finding, idx) => {
            const isActive = idx === activeIndex;
            const isPrev = idx === activeIndex - 1;
            const isNext = idx === activeIndex + 1;
            
            if (!isActive && !isPrev && !isNext) return null;

            const config = severityConfig[finding.severity] || severityConfig['needs_attention'];
            const Icon = config.icon;

            return (
              <motion.button
                key={finding.id}
                layout
                onClick={() => onSelectFinding(idx)}
                aria-label={`Select finding: ${finding.title}`}
                initial={false}
                animate={{
                  scale: isActive ? 1 : 0.95,
                  opacity: isActive ? 1 : 0.5,
                  width: isActive ? 520 : 200,
                  zIndex: isActive ? 10 : 0
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                  "relative h-[200px] flex flex-col items-start p-6 text-left rounded-2xl border transition-colors overflow-hidden",
                  isActive ? "bg-[var(--pd-surface-raised)] border-[var(--pd-hairline)]" : "bg-[var(--pd-surface)] border-transparent hover:border-[var(--pd-hairline)] cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono border", config.classes)}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-wider">{config.label}</span>
                  </span>
                </div>
                
                <h3 className={cn(
                  "font-display text-[var(--pd-text-primary)] leading-snug mb-2",
                  isActive ? "text-xl" : "text-base line-clamp-2"
                )}>
                  {finding.title}
                </h3>
                
                {isActive && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="font-sans text-sm text-[var(--pd-text-body)] line-clamp-3 mb-auto"
                  >
                    {finding.summary}
                  </motion.p>
                )}

                <div className="mt-auto pt-4 flex w-full">
                  <span className="font-mono text-xs text-[var(--pd-text-muted)] bg-[var(--pd-surface)] px-2 py-1 rounded">
                    {finding.finding_type}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Mobile Single Card Layout */}
        <div className="sm:hidden w-full px-4 relative h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full h-full p-6 flex flex-col items-start bg-[var(--pd-surface-raised)] border border-[var(--pd-hairline)] rounded-2xl"
            >
              {(() => {
                const finding = findings[activeIndex];
                const config = severityConfig[finding.severity] || severityConfig['needs_attention'];
                const Icon = config.icon;
                return (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono border", config.classes)}>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="uppercase tracking-wider">{config.label}</span>
                      </span>
                    </div>
                    
                    <h3 className="font-display text-[var(--pd-text-primary)] text-lg leading-snug mb-2 line-clamp-2">
                      {finding.title}
                    </h3>
                    
                    <p className="font-sans text-sm text-[var(--pd-text-body)] line-clamp-2 mb-auto">
                      {finding.summary}
                    </p>

                    <div className="mt-auto pt-4 flex w-full justify-between items-center">
                      <span className="font-mono text-xs text-[var(--pd-text-muted)] bg-[var(--pd-surface)] px-2 py-1 rounded">
                        {finding.finding_type}
                      </span>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>
          
          <div className="flex items-center justify-center gap-4 mt-6">
            <button 
              onClick={() => onSelectFinding(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="p-2 text-[var(--pd-text-muted)] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[var(--pd-text-primary)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1.5">
              {findings.map((_, i) => (
                <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-colors", i === activeIndex ? "bg-[var(--pd-text-primary)]" : "bg-[var(--pd-hairline)]")} />
              ))}
            </div>
            <button 
              onClick={() => onSelectFinding(Math.min(findings.length - 1, activeIndex + 1))}
              disabled={activeIndex === findings.length - 1}
              className="p-2 text-[var(--pd-text-muted)] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[var(--pd-text-primary)]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
