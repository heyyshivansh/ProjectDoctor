import React from "react";
import { DiagnosisStatus } from "@/types/diagnosis";
import { cn } from "@/lib/utils";

interface DiagnosisStateIndicatorProps {
  status?: DiagnosisStatus | string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

interface StateConfig {
  label: string;
  dotClass: string;
  badgeClass: string;
  description: string;
}

const STATUS_CONFIG: Record<DiagnosisStatus, StateConfig> = {
  looks_solid: {
    label: "Looks Solid",
    dotClass: "bg-emerald-500 ring-emerald-200",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    description: "Architecture and specifications demonstrate strong technical alignment.",
  },
  needs_attention: {
    label: "Needs Attention",
    dotClass: "bg-amber-500 ring-amber-200",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
    description: "Important technical or verification gaps require investigation.",
  },
  significant_concern: {
    label: "Significant Concern",
    dotClass: "bg-rose-500 ring-rose-200",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200/80",
    description: "Critical architectural contradictions, risks, or missing test suites detected.",
  },
  not_enough_evidence_yet: {
    label: "Not Enough Evidence",
    dotClass: "bg-slate-400 ring-slate-200",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    description: "Additional specification documents or repository commits are needed.",
  },
  not_analyzed: {
    label: "Not Analyzed",
    dotClass: "bg-slate-300 ring-slate-100",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
    description: "Diagnosis has not yet been executed for this project snapshot.",
  },
};

export const DiagnosisStateIndicator: React.FC<DiagnosisStateIndicatorProps> = ({
  status,
  size = "md",
  showLabel = true,
  className,
}) => {
  const normalizedStatus: DiagnosisStatus =
    status && status in STATUS_CONFIG
      ? (status as DiagnosisStatus)
      : "not_analyzed";

  const config = STATUS_CONFIG[normalizedStatus];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs font-medium gap-2",
    lg: "px-3.5 py-1.5 text-sm font-medium gap-2.5",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-colors",
        config.badgeClass,
        sizeClasses[size],
        className
      )}
      title={config.description}
      role="status"
      aria-label={`Qualitative diagnosis state: ${config.label}`}
    >
      <span
        className={cn(
          "rounded-full ring-2 shrink-0",
          config.dotClass,
          dotSizes[size]
        )}
        aria-hidden="true"
      />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};
