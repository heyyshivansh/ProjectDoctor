import React from "react";
import { DiagnosisStatus } from "@/types/diagnosis";
import { cn } from "@/lib/utils";

export interface QualitativeStatusBadgeProps {
  status: DiagnosisStatus | string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
}

interface StatusConfig {
  label: string;
  containerStyles: string;
  dotStyles: string;
  ariaLabel: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  looks_solid: {
    label: "Looks Solid",
    containerStyles: "bg-[var(--pd-mint-wash)] text-[var(--pd-mint)] border-[var(--pd-mint)]/30",
    dotStyles: "bg-[var(--pd-mint)]",
    ariaLabel: "Diagnosis state: Looks Solid",
  },
  needs_attention: {
    label: "Needs Attention",
    containerStyles: "bg-[var(--pd-amber-wash)] text-[var(--pd-amber)] border-[var(--pd-amber)]/30",
    dotStyles: "bg-[var(--pd-amber)]",
    ariaLabel: "Diagnosis state: Needs Attention",
  },
  significant_concern: {
    label: "Significant Concern",
    containerStyles: "bg-[var(--pd-coral-wash)] text-[var(--pd-coral)] border-[var(--pd-coral)]/30",
    dotStyles: "bg-[var(--pd-coral)]",
    ariaLabel: "Diagnosis state: Significant Concern",
  },
  not_enough_evidence_yet: {
    label: "Insufficient Evidence",
    containerStyles: "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-border)]",
    dotStyles: "bg-[var(--pd-text-faint)]",
    ariaLabel: "Diagnosis state: Insufficient Evidence",
  },
  not_analyzed: {
    label: "Not Yet Analyzed",
    containerStyles: "bg-[var(--pd-surface-raised)] text-[var(--pd-text-faint)] border-[var(--pd-border)]",
    dotStyles: "bg-[var(--pd-text-faint)]",
    ariaLabel: "Diagnosis state: Not Yet Analyzed",
  },
};

/**
 * QualitativeStatusBadge: Strictly presents the 5 qualitative backend states.
 * Prohibits numerical scores, percentages, and circular health halos.
 * Styled with Project Doctor semantic tokens.
 */
export const QualitativeStatusBadge: React.FC<QualitativeStatusBadgeProps> = ({
  status,
  className,
  size = "md",
  showDot = true,
}) => {
  const config = STATUS_MAP[status] || {
    label: status.replace(/_/g, " "),
    containerStyles: "bg-[var(--pd-surface-raised)] text-[var(--pd-text-muted)] border-[var(--pd-border)]",
    dotStyles: "bg-[var(--pd-text-faint)]",
    ariaLabel: `Diagnosis state: ${status}`,
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-xs font-mono tracking-tight",
    md: "px-3 py-1 text-xs font-mono font-medium tracking-tight",
    lg: "px-4 py-1.5 text-sm font-mono font-medium tracking-tight",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <span
      role="status"
      aria-label={config.ariaLabel}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border transition-all duration-200 select-none",
        config.containerStyles,
        sizeStyles[size],
        className
      )}
    >
      {showDot && (
        <span
          className={cn("rounded-full animate-pulse", config.dotStyles, dotSizes[size])}
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </span>
  );
};
