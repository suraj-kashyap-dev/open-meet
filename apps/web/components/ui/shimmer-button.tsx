'use client';

import { Slot } from '@radix-ui/react-slot';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

/**
 * High-emphasis CTA with an animated shimmer + strong press feedback.
 * Shimmer lives on a `::before` pseudo-element so Slot can wrap a single child.
 */
export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ className, children, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'group relative inline-flex h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md px-6 text-sm font-medium shadow-sm',
          'bg-foreground text-background',
          // snap transitions on press so the click registers visually
          'transition-[transform,box-shadow,opacity] duration-150 ease-out',
          "before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 before:content-['']",
          // hover lifts slightly, press scales + drops shadow
          'hover:-translate-y-0.5 hover:shadow-md hover:before:translate-x-full',
          'active:translate-y-0 active:scale-[0.97] active:shadow-none active:brightness-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
ShimmerButton.displayName = 'ShimmerButton';
