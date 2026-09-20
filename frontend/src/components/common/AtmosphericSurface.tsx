import React from "react";
import { cn } from "@/lib/utils";

interface AtmosphericSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "subtle" | "active" | "elevated";
  className?: string;
}

export const AtmosphericSurface: React.FC<AtmosphericSurfaceProps> = ({
  children,
  variant = "default",
  className,
  ...props
}) => {
  const variantStyles = {
    default: "bg-white border border-slate-200/80 shadow-sm",
    subtle: "bg-slate-50/70 border border-slate-200/60 shadow-none",
    active: "bg-white border-slate-300 shadow-md ring-1 ring-slate-900/5",
    elevated: "bg-white border border-slate-200 shadow-lg",
  };

  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-200",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
