import React, { useState, useMemo } from "react";
import { FindingSummary } from "@/types/diagnosis";
import { CheckCircle2, ChevronDown, ChevronUp, ShieldCheck, FileCheck, GitFork, Boxes } from "lucide-react";

interface CuratedStrengthsDeckProps {
  strengths: FindingSummary[];
}

interface StrengthPillar {
  id: string;
  categoryTitle: string;
  headline: string;
  icon: React.FC<{ className?: string }>;
  supportingItems: FindingSummary[];
}

/**
 * CuratedStrengthsDeck: Evaluator-friendly presentation groupings for CP7f.
 *
 * Requirements:
 * 1. Derives EXCLUSIVELY from existing backend diagnosis.strengths.
 * 2. Zero invented or inferred claims.
 * 3. If a pillar has no supporting strength evidence, it is strictly omitted.
 * 4. Provides a compact affirmative summary with concise "Evidence ->" disclosure.
 */
export const CuratedStrengthsDeck: React.FC<CuratedStrengthsDeckProps> = ({ strengths }) => {
  const [expandedPillarId, setExpandedPillarId] = useState<string | null>(null);

  // Categorize backend strengths into presentation groupings strictly from backend data
  const pillars = useMemo<StrengthPillar[]>(() => {
    if (!strengths || strengths.length === 0) return [];

    const testItems: FindingSummary[] = [];
    const docItems: FindingSummary[] = [];
    const traceItems: FindingSummary[] = [];
    const modularityItems: FindingSummary[] = [];
    const otherItems: FindingSummary[] = [];

    strengths.forEach((s) => {
      const text = `${s.title} ${s.summary}`.toLowerCase();
      if (text.includes("automated test suite") || text.includes("test suite") || text.includes("test verification")) {
        testItems.push(s);
      } else if (text.includes("documentation") || text.includes("readme") || text.includes("spec document")) {
        docItems.push(s);
      } else if (text.includes("implementation accompanied by") || text.includes("traceability")) {
        traceItems.push(s);
      } else if (text.includes("modularity") || text.includes("architecture") || text.includes("separation of concerns")) {
        modularityItems.push(s);
      } else {
        otherItems.push(s);
      }
    });

    const list: StrengthPillar[] = [];

    if (testItems.length > 0) {
      list.push({
        id: "pillar-test-coverage",
        categoryTitle: "TEST COVERAGE",
        headline: testItems[0].summary || "Automated tests and verification suites are present in the repository.",
        icon: ShieldCheck,
        supportingItems: testItems,
      });
    }

    if (docItems.length > 0) {
      list.push({
        id: "pillar-documentation",
        categoryTitle: "DOCUMENTATION",
        headline: docItems[0].summary || "Standard project documentation artifacts were detected in the repository.",
        icon: FileCheck,
        supportingItems: docItems,
      });
    }

    if (traceItems.length > 0) {
      list.push({
        id: "pillar-traceability",
        categoryTitle: "TRACEABILITY",
        headline: `${traceItems.length} requirement(s) accompanied by matching implementation and candidate test evidence.`,
        icon: GitFork,
        supportingItems: traceItems,
      });
    }

    if (modularityItems.length > 0) {
      list.push({
        id: "pillar-modularity",
        categoryTitle: "CODE MODULARITY",
        headline: modularityItems[0].summary || "Structural separation of responsibilities detected across modules.",
        icon: Boxes,
        supportingItems: modularityItems,
      });
    }

    if (otherItems.length > 0) {
      list.push({
        id: "pillar-engineering-rigor",
        categoryTitle: "ENGINEERING RIGOR",
        headline: otherItems[0].summary,
        icon: CheckCircle2,
        supportingItems: otherItems,
      });
    }

    return list;
  }, [strengths]);

  if (pillars.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#56b68b]" />
        <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-[#56b68b]">
          Verified Architectural Strengths
        </h2>
        <span className="text-xs font-mono text-[#888e9b]">
          ({strengths.length} {strengths.length === 1 ? "Fact" : "Facts"} Confirmed)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          const isExpanded = expandedPillarId === pillar.id;

          return (
            <div
              key={pillar.id}
              className="rounded-xl bg-[#181a1f] border border-[#2c303a] p-5 text-left space-y-3.5 hover:border-[#56b68b]/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#56b68b]">
                  <Icon className="w-4 h-4" />
                  <span>{pillar.categoryTitle}</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#20232a] text-[#888e9b] border border-[#2c303a]">
                  {pillar.supportingItems.length} {pillar.supportingItems.length === 1 ? "Evidence" : "Evidences"}
                </span>
              </div>

              <p className="text-sm font-sans text-[#f2efe9] leading-relaxed">
                {pillar.headline}
              </p>

              <button
                type="button"
                onClick={() => setExpandedPillarId(isExpanded ? null : pillar.id)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[#56b68b] hover:text-[#72caa3] transition-colors pt-1"
              >
                <span>{isExpanded ? "Hide Evidence" : "Evidence →"}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[#2c303a]/70 space-y-2.5">
                  {pillar.supportingItems.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="text-xs font-mono p-2.5 rounded bg-[#111317] border border-[#2c303a] space-y-1">
                      <div className="text-[#f2efe9] font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#56b68b] shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </div>
                      <p className="text-[#888e9b] text-[11px] font-sans line-clamp-2">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                  {pillar.supportingItems.length > 6 && (
                    <div className="text-[11px] font-mono text-[#888e9b] text-center pt-1">
                      + {pillar.supportingItems.length - 6} more verified {pillar.categoryTitle.toLowerCase()} references
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
