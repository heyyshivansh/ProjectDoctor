import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightApertureProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  radius?: number;
}

/**
 * SpotlightAperture: High-craft radial cursor illumination that brings
 * subtle tactile depth to prominent surfaces without loud gradients.
 */
export const SpotlightAperture: React.FC<SpotlightApertureProps> = ({
  children,
  className,
  spotlightColor = "rgba(15, 23, 42, 0.035)",
  radius = 350,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setPosition(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative overflow-hidden rounded-2xl", className)}
      {...props}
    >
      {/* Subtle radial spotlight overlay */}
      {isHovered && position && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 motion-reduce:hidden"
          style={{
            background: `radial-gradient(${radius}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
};
