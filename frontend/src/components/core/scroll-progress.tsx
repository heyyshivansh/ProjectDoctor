'use client';
import { motion, useScroll, useSpring } from 'motion/react';
import { type RefObject } from 'react';
import { cn } from '@/lib/utils';

interface ScrollProgressProps {
  className?: string;
  containerRef?: RefObject<HTMLElement | null>;
  springOptions?: { stiffness?: number; damping?: number; mass?: number };
}

export function ScrollProgress({
  className,
  containerRef,
  springOptions = { stiffness: 200, damping: 30 },
}: ScrollProgressProps) {
  const { scrollYProgress } = useScroll(
    containerRef ? { container: containerRef as RefObject<HTMLElement> } : undefined
  );
  const scaleX = useSpring(scrollYProgress, springOptions);

  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0%' }}
      className={cn('h-0.5 w-full bg-[var(--pd-ai)]', className)}
    />
  );
}
