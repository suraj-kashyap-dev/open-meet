'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { AdminMeetingDto } from '@open-meet/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useForceEndMeeting } from '@/features/admin/meetings/hooks/use-admin-meetings';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  meeting: AdminMeetingDto | null;
  onClose: () => void;
}

export function EndMeetingDialog({ meeting, onClose }: Props) {
  const forceEnd = useForceEndMeeting();
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    if (!meeting) {
      return;
    }

    setBusy(true);

    try {
      await forceEnd.mutateAsync(meeting.id);
      toast.success(`Ended meeting ${meeting.code}`);
      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not end meeting';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(meeting)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Force-end this meeting?</DialogTitle>
          <DialogDescription>
            {meeting?.activeParticipantCount && meeting.activeParticipantCount > 0
              ? `${meeting.activeParticipantCount} participant${meeting.activeParticipantCount === 1 ? ' is' : 's are'} currently in the room. They'll be disconnected immediately.`
              : 'The meeting status will be marked ENDED and its LiveKit room (if any) will be closed.'}
          </DialogDescription>
        </DialogHeader>

        {meeting ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <p>
              <span className="font-mono">{meeting.code}</span>
              {meeting.title ? ` · ${meeting.title}` : null}
            </p>
            <p className="mt-0.5">hosted by {meeting.hostName}</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? 'Ending…' : 'End meeting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
