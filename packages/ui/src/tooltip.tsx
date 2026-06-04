'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef } from 'react';

import { cn } from './cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipPortal = TooltipPrimitive.Portal;

export const TooltipContent = forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'group relative z-50 rounded-md border border-border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md animate-fade-in',
        className,
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          'absolute -z-10 h-2 w-2 rotate-45 border-border bg-popover',
          'group-data-[side=top]:bottom-0 group-data-[side=top]:left-1/2 group-data-[side=top]:-translate-x-1/2 group-data-[side=top]:translate-y-1/2 group-data-[side=top]:border-b group-data-[side=top]:border-r',
          'group-data-[side=bottom]:top-0 group-data-[side=bottom]:left-1/2 group-data-[side=bottom]:-translate-x-1/2 group-data-[side=bottom]:-translate-y-1/2 group-data-[side=bottom]:border-l group-data-[side=bottom]:border-t',
          'group-data-[side=left]:right-0 group-data-[side=left]:top-1/2 group-data-[side=left]:-translate-y-1/2 group-data-[side=left]:translate-x-1/2 group-data-[side=left]:border-r group-data-[side=left]:border-t',
          'group-data-[side=right]:left-0 group-data-[side=right]:top-1/2 group-data-[side=right]:-translate-x-1/2 group-data-[side=right]:-translate-y-1/2 group-data-[side=right]:border-b group-data-[side=right]:border-l',
        )}
      />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
