'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';

import { cn } from './cn';

interface SpotlightProps {
  className?: string;
}

export function Spotlight({ className }: SpotlightProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ref = useRef<HTMLDivElement>(null);

  const smoothX = useSpring(x, { stiffness: 200, damping: 30 });
  const smoothY = useSpring(y, { stiffness: 200, damping: 30 });

  const background = useTransform([smoothX, smoothY], ([cx, cy]) => {
    return `radial-gradient(420px circle at ${cx}px ${cy}px, var(--hero-glow), transparent 70%)`;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      x.set(e.clientX - rect.left);
      y.set(e.clientY - rect.top);
    };
    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousemove', onMove);
    };
  }, [x, y]);

  return (
    <div
      ref={ref}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <motion.div className="absolute inset-0" style={{ background }} />
    </div>
  );
}
