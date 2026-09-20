import React from "react";
import { FindingSummary, FindingSeverity } from "@/types/diagnosis";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface FindingSelectorBarProps {
  findings: FindingSummary[];
  activeFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; icon: React.FC<{ className?: string }>; badgeColor: string }
> = {
  critical: {
    label: "Critical",
    icon: AlertCircle,
    badgeColor: "text-rose-700 bg-rose-50 border-rose-200",
  },
  major: {
    label: "Major",
    icon: AlertTriangle,
    badgeColor: "text-amber-700 bg-amber-50 border-amber-200",
  },
  needs_attention: {
    label: "Attention",
    icon: AlertTriangle,
    badgeColor: "text-amber-700 bg-amber-50 border-amber-200",
  },
  improvement: {
    label: "Improvement",
    icon: Info,
    badgeColor: "text-blue-700 bg-blue-50 border-blue-200",
  },
  strength: {
    label: "Strength",
    icon: CheckCircle2,
    badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
};

/**
 * FindingSelectorBar: Tactile switcher between prioritized signals.
 * Full keyboard navigation with ArrowLeft / ArrowRight.
 */
export const FindingSelectorBar: React.FC<FindingSelectorBarProps> = ({
  findings,
  activeFindingId,
  onSelectFinding,
  className,
}) => {
  if (findings.length <= 1) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % findings.length;
      onSelectFinding(findings[nextIndex].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + findings.length) % findings.length;
      onSelectFinding(findings[prevIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Prioritized Diagnostic Signals"
      className={cn(
        "flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/60",
        className
      )}
    >
      {findings.map((finding, idx) => {
        const isActive = finding.id === activeFindingId;
        const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.needs_attention;
        const Icon = config.icon;

        return (
          <button
            key={finding.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelectFinding(finding.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1",
              isActive
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center w-4 h-4 rounded-full border",
                config.badgeColor
              )}
            >
              <Icon className="w-2.5 h-2.5" />
            </span>
            <span className="truncate max-w-[180px]">{finding.title}</span>
          </button>
        );
      })}
    </div>
  );
};
