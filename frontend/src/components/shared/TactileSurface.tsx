import React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export interface TactileSurfaceProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  elevation?: "flat" | "raised" | "floating";
}

/**
 * TactileSurface: Light warm surface wrapper with warm borders,
 * subtle shadow and spring micro-press physics.
 */
export const TactileSurface = React.forwardRef<HTMLDivElement, TactileSurfaceProps>(
  (
    {
      children,
      className,
      interactive = false,
      elevation = "raised",
      ...props
    },
    ref
  ) => {
    const elevationStyles = {
      flat: "bg-[var(--pd-surface)] border border-[var(--pd-border)] shadow-none",
      raised:
        "bg-[var(--pd-surface)] border border-[var(--pd-border)] shadow-pd-card",
      floating:
        "bg-[var(--pd-surface-glass)] border border-[var(--pd-border)] shadow-pd-elevated backdrop-blur-md",
    };

    const interactiveStyles = interactive
      ? "cursor-pointer transition-all duration-200 hover:border-[var(--pd-border-hover)] hover:shadow-pd-elevated active:border-[var(--pd-border-focus)]"
      : "";

    return (
      <motion.div
        ref={ref}
        whileTap={interactive ? { scale: 0.988 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "rounded-2xl text-[var(--pd-text-primary)] transition-colors relative overflow-hidden",
          elevationStyles[elevation],
          interactiveStyles,
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

TactileSurface.displayName = "TactileSurface";
