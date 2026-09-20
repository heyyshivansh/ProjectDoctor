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
 * TactileSurface: Physical dark tactile surface wrapper with crisp 1px borders,
 * specular rim lighting, and spring micro-press physics.
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
      flat: "bg-pd-surface border border-pd-hairline shadow-none",
      raised:
        "bg-pd-surface border border-pd-hairline shadow-[0_4px_20px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.04]",
      floating:
        "bg-pd-surface/95 border border-pd-hairline shadow-pd-dossier ring-1 ring-white/[0.06] backdrop-blur-md",
    };

    const interactiveStyles = interactive
      ? "cursor-pointer transition-all duration-200 hover:border-pd-accent/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_16px_rgba(201,138,75,0.12)] active:border-pd-accent"
      : "";

    return (
      <motion.div
        ref={ref}
        whileTap={interactive ? { scale: 0.988 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "rounded-2xl text-pd-text transition-colors relative overflow-hidden",
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
