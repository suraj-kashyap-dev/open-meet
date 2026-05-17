'use client';

import { Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  pending: boolean;
  dirty: boolean;
  onReset: () => void;
  submitLabel?: string;
  pendingLabel?: string;
}

export function FormActions({
  pending,
  dirty,
  onReset,
  submitLabel = 'Save changes',
  pendingLabel = 'Saving…',
}: Props) {
  return (
    <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
      <Button
        type="button"
        variant="ghost"
        disabled={! dirty || pending}
        onClick={onReset}
      >
        Reset
      </Button>

      <Button type="submit" disabled={! dirty || pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {pendingLabel}
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            {submitLabel}
          </>
        )}
      </Button>
    </div>
  );
}
