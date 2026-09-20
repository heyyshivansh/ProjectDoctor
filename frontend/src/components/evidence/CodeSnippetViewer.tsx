import React from "react";
import { HydratedEvidenceItem } from "@/types/diagnosis";
import { Code2, ExternalLink } from "lucide-react";

interface CodeSnippetViewerProps {
  item: HydratedEvidenceItem;
  githubRepoUrl?: string | null;
}

/**
 * CodeSnippetViewer: Monospace code implementation excerpt.
 * Displays file path, line numbers, and conditional external GitHub link
 * ONLY if the repository URL is actually known.
 */
export const CodeSnippetViewer: React.FC<CodeSnippetViewerProps> = ({
  item,
  githubRepoUrl,
}) => {
  if (!item.file_path && !item.snippet) {
    return null;
  }

  const hasLines = item.line_start !== null && item.line_start !== undefined;
  const lineLabel = hasLines
    ? item.line_end !== null && item.line_end !== undefined && item.line_end !== item.line_start
      ? `L${item.line_start}-L${item.line_end}`
      : `L${item.line_start}`
    : null;

  let externalUrl: string | null = null;
  if (githubRepoUrl && item.file_path) {
    const cleanRepo = githubRepoUrl.replace(/\/$/, "");
    if (hasLines) {
      externalUrl = `${cleanRepo}/blob/main/${item.file_path}#L${item.line_start}${
        item.line_end && item.line_end !== item.line_start ? `-L${item.line_end}` : ""
      }`;
    } else {
      externalUrl = `${cleanRepo}/blob/main/${item.file_path}`;
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#2a2f38] bg-[#0b0d10] text-[#eceae4] text-left">
      {/* Code Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#15181d] border-b border-[#2a2f38] text-xs font-mono">
        <span className="flex items-center gap-2 text-[#eceae4] truncate">
          <Code2 className="w-3.5 h-3.5 text-[#c98a4b]" />
          {item.file_path || "Source Implementation"}
        </span>

        <div className="flex items-center gap-2">
          {lineLabel && (
            <span className="font-mono text-[11px] text-[#c98a4b] bg-[#0b0d10] border border-[#2a2f38] px-2 py-0.5 rounded">
              {lineLabel}
            </span>
          )}

          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#9aa0aa] hover:text-[#c98a4b] transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Code Body with Monospace font */}
      {item.snippet ? (
        <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-[#eceae4] bg-[#0b0d10] whitespace-pre selection:bg-[#c98a4b]/30">
          <code>{item.snippet}</code>
        </div>
      ) : (
        <div className="p-4 text-xs text-[#5c626f] font-mono italic">
          No code snippet excerpt hydrated for this source reference.
        </div>
      )}
    </div>
  );
};
