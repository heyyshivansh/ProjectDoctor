import React, { useState } from "react";
import { ChevronDown, ChevronUp, Terminal, Copy, Check } from "lucide-react";

interface DebugJsonViewerProps {
  data: any;
}

/**
 * DebugJsonViewer: Explicit developer/debug inspection view.
 * Kept strictly opt-in behind a toggle so students are not overwhelmed by raw payloads.
 */
export const DebugJsonViewer: React.FC<DebugJsonViewerProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pt-3 border-t border-[#2a2f38] space-y-2 text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 text-xs font-mono text-[#9aa0aa] hover:text-[#eceae4] transition-colors"
      >
        <Terminal className="w-3.5 h-3.5 text-[#c98a4b]" />
        <span>{isOpen ? "Hide Raw Diagnostic JSON" : "Inspect Raw Diagnostic JSON (Developer / Debug)"}</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="relative rounded-xl overflow-hidden border border-[#2a2f38] bg-[#0b0d10] text-[#eceae4]">
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#15181d] border-b border-[#2a2f38] text-[11px] font-mono text-[#9aa0aa]">
            <span className="text-[#c98a4b]">raw_diagnostic_payload.json</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 hover:text-[#eceae4] transition-colors text-xs"
            >
              {copied ? <Check className="w-3 h-3 text-[#4fae82]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy Payload"}</span>
            </button>
          </div>
          <pre className="p-4 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed text-[#eceae4] selection:bg-[#c98a4b]/30">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
};
