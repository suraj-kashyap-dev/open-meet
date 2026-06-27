'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef, useEffect, useId, useRef, type HTMLAttributes } from 'react';

import { cn } from './cn';

function useDialogHistory(
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
) {
  const id = useId();

  const onOpenChangeRef = useRef(onOpenChange);

  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open || typeof window === 'undefined' || !onOpenChangeRef.current) {
      return;
    }

    let pushed = false;

    const frame = window.requestAnimationFrame(() => {
      const state = window.history.state as Record<string, unknown> | null;

      window.history.pushState({ ...state, __omDialogId: id }, '');

      pushed = true;
    });

    const onPopState = () => {
      onOpenChangeRef.current?.(false);
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.cancelAnimationFrame(frame);

      window.removeEventListener('popstate', onPopState);

      const state = window.history.state as { __omDialogId?: string } | null;

      if (pushed && state?.__omDialogId === id) {
        window.history.back();
      }
    };
  }, [open, id]);
}

export function Dialog({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  useDialogHistory(open, onOpenChange);

  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props} />;
}

export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-overlay-show data-[state=closed]:animate-overlay-hide',
      className,
    )}
    {...props}
  />
));

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    {}
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 overflow-y-auto focus:outline-none',
        'data-[state=open]:animate-content-show data-[state=closed]:animate-content-hide',
      )}
      {...props}
    >
      {}
      <DialogPrimitive.Close
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 cursor-default focus:outline-none"
      />
      <div className="pointer-events-none relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          className={cn(
            'pointer-events-auto relative grid w-full max-w-lg gap-4 rounded-lg border border-border bg-card p-4 shadow-lg sm:p-6',
            className,
          )}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </div>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2',
      '[&>button]:w-full sm:[&>button]:w-auto',
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
