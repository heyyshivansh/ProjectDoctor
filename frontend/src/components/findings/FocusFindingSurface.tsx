import React from "react";
import { FindingSummary, FindingSeverity } from "@/types/diagnosis";
import { TactileSurface } from "@/components/shared/TactileSurface";
import { ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusFindingSurfaceProps {
  finding: FindingSummary;
  isPrimary?: boolean;
  isExpanded?: boolean;
  onToggleExpand: () => void;
  className?: string;
}

const SEVERITY_THEME: Record<
  FindingSeverity,
  { label: string; badge: string; icon: React.FC<{ className?: string }> }
> = {
  critical: {
    label: "Critical Concern",
    badge: "bg-rose-50 text-rose-900 border-rose-200",
    icon: AlertCircle,
  },
  major: {
    label: "Major Issue",
    badge: "bg-amber-50 text-amber-900 border-amber-200",
    icon: AlertTriangle,
  },
  needs_attention: {
    label: "Needs Attention",
    badge: "bg-amber-50 text-amber-900 border-amber-200",
    icon: AlertTriangle,
  },
  improvement: {
    label: "Improvement Opportunity",
    badge: "bg-blue-50 text-blue-900 border-blue-200",
    icon: Info,
  },
  strength: {
    label: "Confirmed Strength",
    badge: "bg-emerald-50 text-emerald-900 border-emerald-200",
    icon: CheckCircle2,
  },
};

/**
 * FocusFindingSurface: The singular dominant focal object in the Diagnostic Studio.
 * Presents the highest-priority available finding with clear editorial typography
 * and an intuitive in-place expansion trigger.
 */
export const FocusFindingSurface: React.FC<FocusFindingSurfaceProps> = ({
  finding,
  isPrimary = false,
  isExpanded = false,
  onToggleExpand,
  className,
}) => {
  const theme = SEVERITY_THEME[finding.severity] || SEVERITY_THEME.needs_attention;
  const Icon = theme.icon;

  return (
    <TactileSurface
      elevation="floating"
      className={cn(
        "p-6 sm:p-8 bg-white border-slate-200/90 transition-all",
        className
      )}
    >
      <div className="space-y-4">
        {/* Top Header Row: Category Badge & Priority Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border",
                theme.badge
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{theme.label}</span>
            </span>

            {isPrimary && (
              <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Highest-Priority Available Finding
              </span>
            )}
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {finding.finding_type}
          </span>
        </div>

        {/* Large Commanding Finding Title */}
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 leading-snug">
          {finding.title}
        </h2>

        {/* Finding Summary Narrative */}
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          {finding.summary}
        </p>

        {/* Expansion Affordance */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-900 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 rounded-lg py-1 px-2 -ml-2"
          >
            <span>{isExpanded ? "Collapse Finding Details" : "Explore Finding & Evidence"}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <span className="text-xs text-slate-400">
            {isExpanded ? "Levels 3-5 Active" : "Unfolds Levels 3-5"}
          </span>
        </div>
      </div>
    </TactileSurface>
  );
};
