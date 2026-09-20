import React from "react";
import { FindingSummary, FindingSeverity } from "@/types/diagnosis";
import { AlertCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FindingSpotlightCardProps {
  finding: FindingSummary;
  isSelected?: boolean;
  onSelect: (findingId: string) => void;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; badgeClass: string; icon: React.FC<{ className?: string }> }
> = {
  critical: {
    label: "Critical",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200/80",
    icon: AlertCircle,
  },
  major: {
    label: "Major Issue",
    badgeClass: "bg-orange-50 text-orange-800 border-orange-200/80",
    icon: AlertTriangle,
  },
  needs_attention: {
    label: "Needs Attention",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
    icon: AlertTriangle,
  },
  improvement: {
    label: "Opportunity",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200/80",
    icon: Info,
  },
  strength: {
    label: "Strength",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    icon: Info,
  },
};

export const FindingSpotlightCard: React.FC<FindingSpotlightCardProps> = ({
  finding,
  isSelected = false,
  onSelect,
  className,
}) => {
  const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.needs_attention;
  const IconComponent = config.icon;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(finding.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(finding.id)}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      aria-label={`Inspect finding: ${finding.title}`}
      className={cn(
        "group relative flex flex-col justify-between p-5 rounded-xl border transition-all duration-200 cursor-pointer text-left",
        "focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2",
        isSelected
          ? "bg-white border-slate-900 shadow-md ring-1 ring-slate-900"
          : "bg-white/90 border-slate-200 hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5",
        className
      )}
    >
      <div className="space-y-3">
        {/* Severity Badge */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
              config.badgeClass
            )}
          >
            <IconComponent className="w-3 h-3 shrink-0" />
            <span>{config.label}</span>
          </span>

          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            {finding.finding_type.replace(/_/g, " ")}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
          {finding.title}
        </h3>

        {/* Short Summary */}
        <p className="text-sm text-slate-600 leading-relaxed font-normal line-clamp-3">
          {finding.summary}
        </p>
      </div>

      {/* Footer CTA */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className={cn("font-medium", isSelected ? "text-blue-600" : "text-slate-500")}>
          {isSelected ? "Currently inspecting" : "Inspect finding & proof"}
        </span>
        <ArrowRight
          className={cn(
            "w-3.5 h-3.5 transition-transform",
            isSelected ? "text-blue-600 translate-x-1" : "text-slate-400 group-hover:translate-x-0.5"
          )}
        />
      </div>
    </div>
  );
};
