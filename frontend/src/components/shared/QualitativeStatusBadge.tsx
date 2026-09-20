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
    containerStyles: "bg-[#56b68b]/10 text-[#56b68b] border-[#56b68b]/30 shadow-[0_0_12px_rgba(86,182,139,0.15)]",
    dotStyles: "bg-[#56b68b] shadow-[0_0_8px_rgba(86,182,139,0.6)]",
    ariaLabel: "Diagnosis state: Looks Solid",
  },
  needs_attention: {
    label: "Needs Attention",
    containerStyles: "bg-[#e5a84b]/10 text-[#e5a84b] border-[#e5a84b]/30 shadow-[0_0_12px_rgba(229,168,75,0.15)]",
    dotStyles: "bg-[#e5a84b] shadow-[0_0_8px_rgba(229,168,75,0.6)]",
    ariaLabel: "Diagnosis state: Needs Attention",
  },
  significant_concern: {
    label: "Significant Concern",
    containerStyles: "bg-[#e06c75]/10 text-[#e06c75] border-[#e06c75]/30 shadow-[0_0_12px_rgba(224,108,117,0.15)]",
    dotStyles: "bg-[#e06c75] shadow-[0_0_8px_rgba(224,108,117,0.6)]",
    ariaLabel: "Diagnosis state: Significant Concern",
  },
  not_enough_evidence_yet: {
    label: "Insufficient Evidence",
    containerStyles: "bg-[#20232a] text-[#888e9b] border-[#262a33]",
    dotStyles: "bg-[#888e9b]",
    ariaLabel: "Diagnosis state: Insufficient Evidence",
  },
  not_analyzed: {
    label: "Not Yet Analyzed",
    containerStyles: "bg-[#181a1f] text-[#5d6370] border-[#262a33]",
    dotStyles: "bg-[#5d6370]",
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
    containerStyles: "bg-[#1b1f26] text-[#9aa0aa] border-[#2a2f38]",
    dotStyles: "bg-[#9aa0aa]",
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
