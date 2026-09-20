import React, { useState } from "react";
import { FindingSummary } from "@/types/diagnosis";
import { FindingSpotlightCard } from "./FindingSpotlightCard";
import { StrengthSpotlightCard } from "./StrengthSpotlightCard";
import { cn } from "@/lib/utils";

interface FocusDeckProps {
  findings: FindingSummary[];
  strengths: FindingSummary[];
  selectedFindingId?: string | null;
  onSelectFinding: (findingId: string) => void;
  className?: string;
}

export const FocusDeck: React.FC<FocusDeckProps> = ({
  findings,
  strengths,
  selectedFindingId,
  onSelectFinding,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"findings" | "strengths">("findings");

  if (findings.length === 0 && strengths.length === 0) {
    return (
      <section
        aria-label="Findings Deck"
        className={cn(
          "w-full p-8 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2",
          className
        )}
      >
        <h3 className="text-base font-semibold text-slate-800">No findings detected yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Upload project documents or connect a repository snapshot and re-evaluate to discover technical alignment findings.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Diagnostic Focus Deck" className={cn("w-full space-y-4", className)}>
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Focus Deck
          </h2>
          <p className="text-xs text-slate-500 font-normal">
            Prioritized issues and confirmed strengths from automated analysis.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100/80 border border-slate-200/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("findings")}
            className={cn(
              "px-3 py-1 rounded-md font-medium transition-colors",
              activeTab === "findings"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Findings ({findings.length})
          </button>
          {strengths.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("strengths")}
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors",
                activeTab === "strengths"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Strengths ({strengths.length})
            </button>
          )}
        </div>
      </div>

      {/* Cards List */}
      {activeTab === "findings" ? (
        findings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {findings.map((finding) => (
              <FindingSpotlightCard
                key={finding.id}
                finding={finding}
                isSelected={finding.id === selectedFindingId}
                onSelect={onSelectFinding}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-slate-50 border border-slate-200/60 text-center text-sm text-slate-500">
            No critical findings or warnings identified.
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strengths.map((strength) => (
            <StrengthSpotlightCard key={strength.id} strength={strength} />
          ))}
        </div>
      )}
    </section>
  );
};
