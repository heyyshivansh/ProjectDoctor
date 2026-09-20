import React from "react";
import { cn } from "@/lib/utils";

export interface RailSection {
  id: string;
  label: string;
  indexLabel: string;
}

interface ContextualReadingRailProps {
  sections: RailSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
}

/**
 * ContextualReadingRail: A subtle, quiet vertical progress rail.
 * Replaces dashboard-style tab navigation with an ambient scroll orientation marker.
 * Strictly non-dominant, minimal presence.
 */
export const ContextualReadingRail: React.FC<ContextualReadingRailProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
}) => {
  if (!sections || sections.length <= 1) return null;

  return (
    <nav
      aria-label="Diagnostic Journey Navigation"
      className="hidden xl:flex fixed left-6 top-1/2 -translate-y-1/2 z-20 flex-col gap-5 py-4 px-2"
    >
      <div className="flex flex-col gap-4 relative">
        {/* Subtle vertical indicator rail line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#2c303a]" aria-hidden="true" />

        {sections.map((sec) => {
          const isActive = sec.id === activeSectionId;
          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className="group flex items-center gap-3 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d4924f] rounded-sm py-0.5"
              aria-current={isActive ? "step" : undefined}
            >
              {/* Dot indicator */}
              <div
                className={cn(
                  "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-200 z-10",
                  isActive
                    ? "border-[#d4924f] bg-[#111317] shadow-[0_0_10px_rgba(212,146,79,0.35)]"
                    : "border-[#2c303a] bg-[#181a1f] group-hover:border-[#888e9b]"
                )}
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-200",
                    isActive ? "bg-[#d4924f] scale-100" : "bg-transparent scale-0 group-hover:bg-[#888e9b] group-hover:scale-75"
                  )}
                />
              </div>

              {/* Quiet editorial text label */}
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase tracking-wider transition-colors duration-200",
                    isActive
                      ? "text-[#d4924f] font-medium"
                      : "text-[#5a606e] group-hover:text-[#888e9b]"
                  )}
                >
                  {sec.indexLabel}
                </span>
                <span
                  className={cn(
                    "text-xs font-mono transition-colors duration-200 line-clamp-1 max-w-[130px]",
                    isActive
                      ? "text-[#f2efe9] font-medium"
                      : "text-[#5a606e] group-hover:text-[#888e9b]"
                  )}
                >
                  {sec.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
