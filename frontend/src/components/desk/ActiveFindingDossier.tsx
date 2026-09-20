import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, AlertTriangle, AlertCircle, ArrowUpRight, Sparkles, ChevronDown, FileSearch } from 'lucide-react';
import { FindingSummary, FindingDetail, FindingSeverity } from '@/types/diagnosis';
import { cn } from '@/lib/utils';

interface ActiveFindingDossierProps {
  finding: FindingSummary;
  findingDetail: FindingDetail | null;
  onOpenEvidence: () => void;
}

const severityConfig: Record<FindingSeverity, { icon: React.ElementType; classes: string; label: string }> = {
  critical: { icon: Flame, classes: 'text-[#F43F5E] bg-[#F43F5E]/12 border-[#F43F5E]/25', label: 'Critical' },
  major: { icon: AlertTriangle, classes: 'text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/25', label: 'Major' },
  needs_attention: { icon: AlertCircle, classes: 'text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/25', label: 'Needs Attention' },
  improvement: { icon: ArrowUpRight, classes: 'text-[#10B981] bg-[#10B981]/12 border-[#10B981]/25', label: 'Improvement' },
  strength: { icon: Sparkles, classes: 'text-[#10B981] bg-[#10B981]/12 border-[#10B981]/25', label: 'Strength' },
};

function ExpandableSection({ title, content, defaultOpen = true }: { title: string; content: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!content) return null;

  return (
    <div className="border-l-2 border-[var(--pd-hairline)] pl-4 py-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-mono text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] transition-colors mb-2 w-full text-left uppercase tracking-wider"
      >
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen ? "rotate-180" : "")} />
        {title}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="font-sans text-[var(--pd-text-body)] text-base leading-relaxed py-2">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ActiveFindingDossier({ finding, findingDetail, onOpenEvidence }: ActiveFindingDossierProps) {
  const config = severityConfig[finding.severity] || severityConfig['needs_attention'];
  const Icon = config.icon;

  const whyItMatters = finding.why_it_matters || findingDetail?.why_it_matters;
  const whatToDo = finding.suggested_action || findingDetail?.suggested_action;
  const hasEvidence = findingDetail && findingDetail.evidence_references && findingDetail.evidence_references.length > 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={finding.id}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="w-full bg-[var(--pd-surface)] border border-[var(--pd-hairline)] rounded-2xl overflow-hidden"
      >
        <div className="p-6 sm:p-8 space-y-8">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono border", config.classes)}>
                <Icon className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">{config.label}</span>
              </span>
            </div>
            
            <h2 className="font-display text-2xl sm:text-3xl text-[var(--pd-text-primary)] font-medium leading-tight">
              {finding.title}
            </h2>
            
            <p className="font-sans text-lg text-[var(--pd-text-body)] leading-relaxed">
              {finding.summary}
            </p>
          </div>

          <div className="space-y-6">
            <ExpandableSection 
              title="Why It Matters" 
              content={whyItMatters} 
              defaultOpen={true}
            />
            
            <ExpandableSection 
              title="What To Do" 
              content={whatToDo} 
              defaultOpen={true}
            />
          </div>

          <div className="pt-6 border-t border-[var(--pd-hairline)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="font-mono text-xs text-[var(--pd-text-muted)] uppercase tracking-wider bg-[var(--pd-surface-raised)] px-3 py-1.5 rounded-md">
              TYPE: {finding.finding_type}
            </span>
            
            {hasEvidence && (
              <button 
                onClick={onOpenEvidence}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--pd-accent)] hover:bg-[var(--pd-accent)]/90 text-white rounded-lg font-sans font-medium transition-colors"
              >
                <FileSearch className="w-4 h-4" />
                See evidence →
              </button>
            )}
          </div>
          
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
