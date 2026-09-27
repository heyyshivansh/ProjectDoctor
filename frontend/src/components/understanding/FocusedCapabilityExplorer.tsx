import React, { useState } from "react";
import { Boxes, FileText, ExternalLink, ShieldCheck } from "lucide-react";
import { Artifact } from "@/types/project";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FocusedCapabilityExplorerProps {
  modules: string[];
  requirementsSummary?: string | null;
  provenance?: Record<string, any>;
  artifacts?: Artifact[];
  onInspectArtifact?: (artifactId: string) => void;
}

export const FocusedCapabilityExplorer: React.FC<FocusedCapabilityExplorerProps> = ({
  modules,
  requirementsSummary,
  provenance = {},
  artifacts = [],
  onInspectArtifact,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (!modules || modules.length === 0) {
    return (
      <div className="p-8 sm:p-10 rounded-2xl bg-[var(--pd-surface)] border border-[var(--pd-border)] space-y-3 text-left">
        <div className="flex items-center gap-2.5 text-[var(--pd-amber)]">
          <Boxes className="w-5 h-5" />
          <h3 className="text-base sm:text-lg font-semibold text-[var(--pd-text-primary)]">
            No capabilities explicitly extracted
          </h3>
        </div>
        <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
          Project Doctor could not identify discrete functional capability modules from the supplied project documentation.
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(selectedIndex, modules.length - 1);
  const activeModule = modules[safeIndex];

  // Look up source document provenance for the active module
  const moduleProvList: any[] = Array.isArray(provenance?.modules) ? provenance.modules : [];
  const activeProv = moduleProvList.find(
    (p) => String(p.value).trim().toLowerCase() === String(activeModule).trim().toLowerCase()
  );

  const matchedArtifact = activeProv?.artifact_id
    ? artifacts.find((a) => a.id === activeProv.artifact_id)
    : null;

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] font-medium">
          Claimed Capabilities &bull; Focused Concept Exploration
        </span>
        <span className="text-xs font-mono text-[var(--pd-text-muted)]">
          {modules.length} capability module{modules.length === 1 ? "" : "s"} identified
        </span>
      </div>

      {/* Master-Detail Interactive Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Master Selector Rail (Left Column on Desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
          {modules.map((mod, idx) => {
            const isSelected = idx === safeIndex;
            const numberLabel = String(idx + 1).padStart(2, "0");

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pd-ai)]",
                  isSelected
                    ? "bg-[var(--pd-surface-raised)] border-[var(--pd-ai)]/50 shadow-sm text-[var(--pd-text-primary)] font-medium"
                    : "bg-[var(--pd-surface)]/60 border-[var(--pd-border)] text-[var(--pd-text-body)] hover:text-[var(--pd-text-primary)] hover:border-[var(--pd-border-hover)]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      "text-xs font-mono px-2 py-0.5 rounded",
                      isSelected
                        ? "bg-[var(--pd-ai-wash)] text-[var(--pd-ai)] font-bold border border-[var(--pd-ai)]/20"
                        : "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border border-[var(--pd-border)]"
                    )}
                  >
                    {numberLabel}
                  </span>
                  <span className="text-sm font-sans truncate">{mod}</span>
                </div>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--pd-ai)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Focused Detail Canvas (Right Column on Desktop) */}
        <div className="lg:col-span-8 bg-[var(--pd-surface)] border border-[var(--pd-border)] rounded-2xl p-6 sm:p-7 flex flex-col justify-between min-h-[380px] shadow-pd-card">
          <div className="space-y-6">
            {/* Top Eyebrow & Capability Name */}
            <div className="space-y-2 border-b border-[var(--pd-border)] pb-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-ai)] flex items-center gap-1.5 font-semibold">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>
                    Capability {safeIndex + 1} of {modules.length}
                  </span>
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[var(--pd-surface-raised)] border border-[var(--pd-border)] text-[var(--pd-text-muted)]">
                  Stated in Project Scope
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-sans font-semibold text-[var(--pd-text-primary)] leading-snug">
                {activeModule}
              </h3>
            </div>

            {/* Scope / Stated Description */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)]">
                Stated Functionality &amp; Scope
              </span>
              <p className="text-sm font-sans text-[var(--pd-text-body)] leading-relaxed">
                Extracted capability module representing a core system responsibility of your project.
                {requirementsSummary
                  ? ` Aligned with the overall project requirements summary: "${requirementsSummary}"`
                  : " Documented in your uploaded project specifications."}
              </p>
            </div>

            {/* Evidence Grounding Citation */}
            <div className="bg-[var(--pd-surface-raised)]/60 border border-[var(--pd-border)] rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--pd-text-muted)] flex items-center gap-1.5 font-semibold">
                  <FileText className="w-3.5 h-3.5 text-[var(--pd-ai)]" />
                  Evidence Grounding &bull; Document Source
                </span>
                {activeProv?.page != null && (
                  <span className="text-xs font-mono text-[var(--pd-text-muted)]">
                    Page {activeProv.page}
                  </span>
                )}
              </div>

              {activeProv ? (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-[var(--pd-text-primary)] truncate">
                        {matchedArtifact?.original_filename || "Project Specification Document"}
                      </p>
                      {activeProv.section && (
                        <p className="text-xs font-mono text-[var(--pd-text-muted)] truncate">
                          Section: {activeProv.section}
                        </p>
                      )}
                    </div>

                    {activeProv.artifact_id && onInspectArtifact && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onInspectArtifact(activeProv.artifact_id)}
                        className="gap-1.5 text-xs font-mono bg-[var(--pd-surface-raised)] border-[var(--pd-border)] text-[var(--pd-text-primary)] hover:border-[var(--pd-ai)] hover:text-white shrink-0 self-start sm:self-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[var(--pd-ai)]" />
                        <span>Inspect Source Spec</span>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-sans text-[var(--pd-text-muted)] italic">
                  Extracted from declared project description or introductory documentation.
                </p>
              )}
            </div>
          </div>

          {/* Verification Pipeline Note */}
          <div className="pt-4 border-t border-[var(--pd-border)] flex items-center gap-2 text-xs font-mono text-[var(--pd-text-muted)]">
            <ShieldCheck className="w-4 h-4 text-[var(--pd-ai)] shrink-0" />
            <span>
              This capability will be compared against repository code evidence when you run Analyze Project.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
