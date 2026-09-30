import re

code = '''import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, FileCheck2, ShieldCheck, Zap, X, AlertCircle, FileSearch } from 'lucide-react';
import { FindingSummary, FindingDetail } from '@/types/diagnosis';
import { getFindingDetail } from '@/services/diagnosis';
import { cn } from '@/lib/utils';
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogTitle,
  MorphingDialogDescription,
} from '@/components/motion-primitives/morphing-dialog';

interface VerifiedStrengthsShowcaseProps {
  strengths: FindingSummary[];
  projectId: string;
}

const StrengthCard = ({ strength, projectId }: { strength: FindingSummary, projectId: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [detail, setDetail] = useState<FindingDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = () => {
    if (!detail && !loading) {
      setLoading(true);
      getFindingDetail(projectId, strength.id).then(d => {
        setDetail(d);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  };

  const renderEvidence = () => {
    if (loading) return <div className="p-4 text-center text-sm text-[var(--pd-text-muted)]">Loading evidence...</div>;
    if (!detail?.hydrated_evidence || detail.hydrated_evidence.length === 0) {
      return (
        <div className="p-8 bg-[var(--pd-surface)] rounded-xl text-center border border-[var(--pd-border)]">
          <FileSearch className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-[var(--pd-text-muted)]">No source evidence is linked yet.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 mt-4 max-h-[50vh] overflow-y-auto pr-2 text-left">
        {detail.hydrated_evidence.map((ev: any, i: number) => (
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

  const extractCapabilityName = (title: string): string => {
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

  const capabilityName = extractCapabilityName(strength.title);
  let BadgeIcon = FileCheck2;
  if (strength.finding_type.includes('architecture') || strength.finding_type.includes('system')) {
    BadgeIcon = ShieldCheck;
  } else if (strength.finding_type.includes('performance') || strength.finding_type.includes('optimization')) {
    BadgeIcon = Zap;
  }

  return (
    <MorphingDialog transition={{ type: 'spring', bounce: 0, duration: 0.3 }}>
      <MorphingDialogTrigger
        onPointerDown={fetchDetail}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative cursor-pointer bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-xl p-5 flex flex-col justify-between min-h-[170px] transition-all duration-200 w-full text-left",
          "hover:border-[var(--pd-mint)]/40 hover:shadow-pd-glow-mint"
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
          <p className="text-xs text-[var(--pd-text-body)] leading-relaxed line-clamp-2">
            {isHovered && strength.why_it_matters
              ? strength.why_it_matters
              : strength.summary || "Implementation and automated test suite confirmed by deterministic evidence."}
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-[var(--pd-border)] flex items-center justify-between text-[11px] font-mono text-[var(--pd-text-muted)] group-hover:text-[var(--pd-mint)] transition-colors">
          <span>{isHovered ? "Inspect proof \\u2192" : "Confirmed by code & tests"}</span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">\\u2192</span>
        </div>
      </MorphingDialogTrigger>
      
      <MorphingDialogContainer>
        <MorphingDialogContent className="pointer-events-auto w-full max-w-2xl rounded-2xl bg-[var(--pd-surface)] p-6 shadow-2xl border border-[var(--pd-border)] flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <MorphingDialogTitle className="text-lg font-semibold text-[var(--pd-text-primary)] pr-8">
              {strength.title}
            </MorphingDialogTitle>
            <MorphingDialogClose className="text-[var(--pd-text-muted)] hover:text-[var(--pd-text-primary)] bg-[var(--pd-surface-raised)] hover:bg-[var(--pd-border-hover)] rounded-full p-2 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </MorphingDialogClose>
          </div>
          <MorphingDialogDescription className="text-sm text-[var(--pd-text-muted)] mb-4">
            {strength.summary}
          </MorphingDialogDescription>
          {renderEvidence()}
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
};

export const VerifiedStrengthsShowcase: React.FC<VerifiedStrengthsShowcaseProps> = ({
  strengths,
  projectId,
}) => {
  if (!strengths || strengths.length === 0) return null;
  const visibleStrengths = strengths;

  return (
    <section aria-label="Verified Capabilities" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[var(--pd-text-primary)] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[var(--pd-mint)]" />
            Verified Capabilities
          </h2>
          <p className="text-sm text-[var(--pd-text-muted)]">
            Features and architecture patterns confirmed by repository evidence.
          </p>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div
          key="showcase"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {visibleStrengths.map((strength) => (
            <motion.div key={strength.id} whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.18 }}>
              <StrengthCard
                strength={strength}
                projectId={projectId}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
'''

with open('frontend/src/components/desk/VerifiedStrengthsShowcase.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
