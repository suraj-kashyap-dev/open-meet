'use client';

import { Check, Minus } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from './cn';

export type CheckedState = boolean | 'indeterminate';

interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'checked'> {
  checked?: CheckedState;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Non-native, tri-state checkbox. Renders a `role="checkbox"` button - no browser
 * default styling, no shadow - and supports an `indeterminate` (partial) state for
 * tree pickers. API mirrors shadcn/Radix (`checked` / `onCheckedChange`).
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const state = checked === 'indeterminate' ? 'indeterminate' : checked ? 'checked' : 'unchecked';
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
        data-state={state}
        disabled={disabled}
        onClick={() => onCheckedChange?.(checked !== true)}
        className={cn(
          'peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-2 border-muted-foreground/50 bg-background text-white shadow-none outline-none transition-colors',
          'hover:border-accent',
          'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
          'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {state === 'checked' ? (
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />
        ) : state === 'indeterminate' ? (
          <Minus className="h-3.5 w-3.5 text-white" strokeWidth={3.5} />
        ) : null}
      </button>
    );
  },
);
Checkbox.displayName = 'Checkbox';
