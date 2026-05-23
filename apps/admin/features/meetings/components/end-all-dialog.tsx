'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { useBulkEndActiveMeetings } from '@/features/meetings/hooks/use-admin-meetings';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  open: boolean;
  activeCount: number;
  onClose: () => void;
}

export function EndAllActiveDialog({ open, activeCount, onClose }: Props) {
  const bulkEnd = useBulkEndActiveMeetings();
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    setBusy(true);

    try {
      const { ended } = await bulkEnd.mutateAsync();
      toast.success(`Ended ${ended} meeting${ended === 1 ? '' : 's'}`);
      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not end active meetings';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>End every active meeting?</DialogTitle>
          <DialogDescription>
            This will mark every meeting with status ACTIVE as ENDED and close their LiveKit rooms.
            Every participant currently in a call will be disconnected immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {activeCount > 0
            ? `${activeCount} meeting${activeCount === 1 ? '' : 's'} currently active.`
            : 'No active meetings right now — nothing will happen.'}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy || activeCount === 0}>
            {busy ? 'Ending…' : 'End all active'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
