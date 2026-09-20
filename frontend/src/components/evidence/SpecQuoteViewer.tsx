import React from "react";
import { HydratedEvidenceItem } from "@/types/diagnosis";
import { FileText, Quote } from "lucide-react";

interface SpecQuoteViewerProps {
  item: HydratedEvidenceItem;
}

/**
 * SpecQuoteViewer: Displays verified specification quotes with page numbers
 * and section titles when available from backend extraction.
 */
export const SpecQuoteViewer: React.FC<SpecQuoteViewerProps> = ({ item }) => {
  if (!item.snippet) {
    return null;
  }

  return (
    <div className="p-5 rounded-xl bg-[#0b0d10] border border-[#2a2f38] space-y-3 text-left">
      {/* Citation Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#9aa0aa]">
        <span className="flex items-center gap-1.5 text-[#eceae4] font-medium truncate">
          <FileText className="w-3.5 h-3.5 text-[#c98a4b]" />
          {item.title || "Specification Document"}
        </span>

        <div className="flex items-center gap-2">
          {item.page_number !== null && item.page_number !== undefined && (
            <span className="bg-[#15181d] border border-[#2a2f38] px-2 py-0.5 rounded text-[11px] text-[#9aa0aa]">
              Page {item.page_number}
            </span>
          )}
          {item.section_title && (
            <span className="bg-[#15181d] border border-[#2a2f38] px-2 py-0.5 rounded text-[11px] text-[#9aa0aa] truncate max-w-[150px]">
              {item.section_title}
            </span>
          )}
        </div>
      </div>

      {/* Quote Block */}
      <div className="relative pl-4 border-l-2 border-[#c98a4b]/60 my-2">
        <Quote className="w-3.5 h-3.5 text-[#c98a4b] absolute -top-1 -left-2.5 bg-[#0b0d10]" />
        <p className="text-xs sm:text-sm text-[#eceae4] italic leading-relaxed whitespace-pre-wrap font-sans">
          "{item.snippet}"
        </p>
      </div>

      {/* Role / Context */}
      {item.role && (
        <span className="inline-block text-[10px] font-mono text-[#5c626f] uppercase tracking-wider">
          Role: {item.role}
        </span>
      )}
    </div>
  );
};
