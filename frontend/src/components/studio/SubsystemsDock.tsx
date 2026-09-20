import React from "react";
import { Activity, ListChecks, GitBranch, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudioTab = "diagnosis" | "requirements" | "repository" | "documents";

interface SubsystemsDockProps {
  activeTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  className?: string;
}

export const SubsystemsDock: React.FC<SubsystemsDockProps> = ({
  activeTab,
  onSelectTab,
  className,
}) => {
  const tabs: Array<{ id: StudioTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: "diagnosis", label: "Diagnostic Stack", icon: Activity },
    { id: "requirements", label: "Requirements", icon: ListChecks },
    { id: "repository", label: "Codebase", icon: GitBranch },
    { id: "documents", label: "Documents", icon: FileText },
  ];

  return (
    <nav
      aria-label="Studio Chapters"
      className={cn(
        "fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40",
        "bg-[#181a1f]/90 backdrop-blur-md border border-[#2c303a] rounded-full shadow-pd-deck p-1 sm:p-1.5",
        "flex items-center gap-1 transition-all max-w-[calc(100vw-1.5rem)] overflow-x-auto",
        className
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all",
              isActive
                ? "bg-[#d4924f] text-[#111317] font-semibold shadow-[0_0_12px_rgba(212,146,79,0.3)]"
                : "text-[#888e9b] hover:text-[#f2efe9] hover:bg-[#20232a]"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
