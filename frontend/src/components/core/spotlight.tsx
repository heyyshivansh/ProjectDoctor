'use client';
import { useRef, useState } from 'react';
import { motion, useSpring, type SpringOptions } from 'motion/react';
import { cn } from '@/lib/utils';

interface SpotlightProps {
  className?: string;
  size?: number;
  springOptions?: SpringOptions;
}

export function Spotlight({
  className,
  size = 200,
  springOptions = { bounce: 0, duration: 0.15 },
}: SpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useSpring(0, springOptions);
  const mouseY = useSpring(0, springOptions);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - size / 2);
    mouseY.set(e.clientY - rect.top - size / 2);
  }

  return (
    <div
      ref={containerRef}
      className='absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none'
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ pointerEvents: 'none' }}
    >
      {isHovered && (
        <motion.div
          className={cn(
            'absolute rounded-full opacity-0 transition-opacity duration-300',
            isHovered && 'opacity-100',
            className
          )}
          style={{
            width: size,
            height: size,
            x: mouseX,
            y: mouseY,
            background: 'radial-gradient(circle, rgba(6,78,59,0.08) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
}
