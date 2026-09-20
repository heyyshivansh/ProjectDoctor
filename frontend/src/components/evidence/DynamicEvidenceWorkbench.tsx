import React from "react";
import { HydratedEvidenceItem } from "@/types/diagnosis";
import { SpecQuoteViewer } from "./SpecQuoteViewer";
import { CodeSnippetViewer } from "./CodeSnippetViewer";
import { Layers, AlertCircle } from "lucide-react";

interface DynamicEvidenceWorkbenchProps {
  evidence: HydratedEvidenceItem[];
  githubRepoUrl?: string | null;
}

/**
 * DynamicEvidenceWorkbench: Enforces the Strictly Data-Driven Evidence Adaptation Matrix.
 * Never fabricates code, specifications, or commits.
 * Adapts composition gracefully without rendering empty placeholder boxes.
 */
export const DynamicEvidenceWorkbench: React.FC<DynamicEvidenceWorkbenchProps> = ({
  evidence,
  githubRepoUrl,
}) => {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="p-5 rounded-xl border border-dashed border-[#2a2f38] bg-[#15181d]/50 text-left">
        <div className="flex items-center gap-2 text-xs font-mono text-[#9aa0aa]">
          <AlertCircle className="w-3.5 h-3.5 text-[#d9a441]" />
          <span>Diagnostic rule verified through abstract syntax analysis and project metadata.</span>
        </div>
      </div>
    );
  }

  // Partition evidence items into specs vs code
  const specItems = evidence.filter(
    (e) => e.target_type === "requirement" || e.target_type === "artifact" || (!e.file_path && e.snippet)
  );
  const codeItems = evidence.filter(
    (e) => e.target_type === "repository_file" || e.target_type === "repository_evidence" || !!e.file_path
  );

  const hasBoth = specItems.length > 0 && codeItems.length > 0;
  const isCodeOnly = codeItems.length > 0 && specItems.length === 0;
  const isSpecOnly = specItems.length > 0 && codeItems.length === 0;

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#9aa0aa]">
          <Layers className="w-3.5 h-3.5 text-[#c98a4b]" />
          <span>Concrete Evidence Anchors</span>
        </div>

        {isCodeOnly && (
          <span className="text-[10px] font-mono text-[#c98a4b] bg-[#c98a4b]/10 border border-[#c98a4b]/20 px-2 py-0.5 rounded">
            Implementation Verification
          </span>
        )}
        {isSpecOnly && (
          <span className="text-[10px] font-mono text-[#d9a441] bg-[#d9a441]/10 border border-[#d9a441]/20 px-2 py-0.5 rounded">
            Specification / Requirement Anchor
          </span>
        )}
      </div>

      <div
        className={
          hasBoth
            ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
            : "flex flex-col gap-4"
        }
      >
        {/* Specification Evidence Column */}
        {specItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-mono text-[#9aa0aa] uppercase tracking-wider">
              Specification Citation
            </h4>
            <div className="space-y-2">
              {specItems.map((item, idx) => (
                <SpecQuoteViewer key={item.target_id || idx} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Code Implementation Evidence Column */}
        {codeItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-mono text-[#9aa0aa] uppercase tracking-wider">
              Repository Implementation
            </h4>
            <div className="space-y-2">
              {codeItems.map((item, idx) => (
                <CodeSnippetViewer
                  key={item.target_id || idx}
                  item={item}
                  githubRepoUrl={githubRepoUrl}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
