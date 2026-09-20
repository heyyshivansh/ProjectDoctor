import React from "react";
import { FindingSummary, FindingDetail, FindingSeverity } from "@/types/diagnosis";
import { WhyItMattersCard } from "@/components/evidence/WhyItMattersCard";
import { CompactFindingEvidenceRow } from "./CompactFindingEvidenceRow";
import { AlertCircle, AlertTriangle, ArrowUpRight, Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FindingDossierCardProps {
  finding: FindingSummary;
  findingDetail: FindingDetail | null;
  index: number;
  totalFindings: number;
  isPrimary?: boolean;
  githubRepoUrl?: string | null;
  className?: string;
  onInspectCodebase?: (filePath?: string) => void;
  onInspectRequirements?: (requirementId?: string) => void;
  onInspectDocuments?: (artifactId?: string) => void;
}

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; container: string; icon: React.FC<{ className?: string }> }
> = {
  critical: {
    label: "Critical Concern",
    container: "bg-[#e06c75]/15 text-[#e06c75] border-[#e06c75]/30 shadow-[0_0_12px_rgba(224,108,117,0.15)]",
    icon: Flame,
  },
  major: {
    label: "Major Issue",
    container: "bg-[#e5a84b]/15 text-[#e5a84b] border-[#e5a84b]/30 shadow-[0_0_12px_rgba(229,168,75,0.15)]",
    icon: AlertTriangle,
  },
  needs_attention: {
    label: "Needs Attention",
    container: "bg-[#e5a84b]/15 text-[#e5a84b] border-[#e5a84b]/30 shadow-[0_0_12px_rgba(229,168,75,0.15)]",
    icon: AlertCircle,
  },
  improvement: {
    label: "Improvement",
    container: "bg-[#56b68b]/15 text-[#56b68b] border-[#56b68b]/30 shadow-[0_0_12px_rgba(86,182,139,0.15)]",
    icon: ArrowUpRight,
  },
  strength: {
    label: "Verified Strength",
    container: "bg-[#56b68b]/15 text-[#56b68b] border-[#56b68b]/30 shadow-[0_0_12px_rgba(86,182,139,0.15)]",
    icon: Sparkles,
  },
};

/**
 * FindingDossierCard: Streamlined primary diagnostic card for CP7f.
 *
 * Implements the 4-step information flow:
 * 1. Finding (Title in Fraunces, Severity pill, Concise summary)
 * 2. Why It Matters (Architectural evaluation rationale)
 * 3. Suggested Action (Concrete fix)
 * 4. Compact Evidence Proof (CompactFindingEvidenceRow with Explorer bridges)
 *
 * Designed with flexible geometry (target ~480-520px baseline) with NO internal scrolling
 * and full content-aware natural height.
 */
export const FindingDossierCard = React.forwardRef<HTMLDivElement, FindingDossierCardProps>(
  (
    {
      finding,
      findingDetail,
      index,
      totalFindings,
      isPrimary = false,
      className,
      onInspectCodebase,
      onInspectRequirements,
      onInspectDocuments,
    },
    ref
  ) => {
    const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.needs_attention;
    const IconComponent = sev.icon;

    // Use detail why/action if available, otherwise fallback to summary
    const whyItMatters = findingDetail?.why_it_matters || finding.why_it_matters;
    const suggestedAction = findingDetail?.suggested_action || finding.suggested_action;
    const evidence = findingDetail?.hydrated_evidence || [];
    const commitSha = findingDetail?.commit_sha || finding.commit_sha;

    return (
      <div
        ref={ref}
        className={cn(
          "dossier-card w-full text-left rounded-2xl bg-[#181a1f] border border-[#2c303a] text-[#f2efe9] shadow-pd-deck p-6 sm:p-8 lg:p-10 space-y-6 relative overflow-hidden",
          className
        )}
      >
        {/* Subtle specular top edge highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4924f]/25 to-transparent"
          aria-hidden="true"
        />

        {/* STEP 1: Finding Header Stage */}
        <div className="space-y-3.5">
          {/* Eyebrow & Severity Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2c303a]/70">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-medium tracking-widest text-[#d4924f]">
                {isPrimary ? "PRIMARY FOCUS FINDING" : `FINDING ${index + 1} OF ${totalFindings}`}
              </span>
              <span className="text-[#2c303a]">•</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border",
                  sev.container
                )}
              >
                <IconComponent className="w-3.5 h-3.5" />
                <span>{sev.label}</span>
              </span>
            </div>

            <span className="text-[11px] font-mono text-[#888e9b]">
              Rule {finding.finding_type || "DIAG"}
            </span>
          </div>

          {/* Finding Title (Fraunces Display) */}
          <h2 className="text-2xl sm:text-3xl font-display font-medium text-[#f2efe9] tracking-tight leading-[1.2]">
            {finding.title}
          </h2>

          {/* Concise Finding Summary */}
          <p className="text-sm sm:text-base font-sans text-[#c4c8d0] leading-relaxed max-w-3xl">
            {finding.summary}
          </p>
        </div>

        {/* STEP 2 & 3: Architectural Rationale & Suggested Action */}
        {whyItMatters && (
          <WhyItMattersCard
            whyItMatters={whyItMatters}
            suggestedAction={suggestedAction}
          />
        )}

        {/* STEP 4: Compact Evidence Proof & Explorer Bridges */}
        <CompactFindingEvidenceRow
          finding={finding}
          evidence={evidence}
          commitSha={commitSha}
          onInspectCodebase={onInspectCodebase}
          onInspectRequirements={onInspectRequirements}
          onInspectDocuments={onInspectDocuments}
        />
      </div>
    );
  }
);

FindingDossierCard.displayName = "FindingDossierCard";
