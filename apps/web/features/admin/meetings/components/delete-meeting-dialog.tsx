'use client';

import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeleteAdminMeeting } from '@/features/admin/meetings/hooks/use-admin-meetings';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  meeting: AdminMeetingDto | null;
  onClose: () => void;
}

export function DeleteMeetingDialog({ meeting, onClose }: Props) {
  const remove = useDeleteAdminMeeting();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (meeting) {
      setTyped('');
    }
  }, [meeting]);

  const canDelete = Boolean(meeting && typed.trim() === meeting.code);

  const onConfirm = async () => {
    if (!meeting || !canDelete) {
      return;
    }

    setBusy(true);

    try {
      await remove.mutateAsync(meeting.id);
      toast.success(`Deleted meeting ${meeting.code}`);
      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not delete meeting';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(meeting)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Permanently delete this meeting?</DialogTitle>
          <DialogDescription>
            This removes the meeting row plus every chat message, attachment, and participant record
            attached to it. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {meeting ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p>
                <span className="font-mono">{meeting.code}</span>
                {meeting.title ? ` · ${meeting.title}` : null}
              </p>
              <p className="mt-0.5">
                {meeting.participantCount} participant rows · {meeting.messageCount} messages
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-code" className="text-xs text-muted-foreground">
                Type the meeting code <span className="font-mono">{meeting.code}</span> to confirm
              </Label>
              <Input
                id="confirm-code"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={meeting.code}
                className="font-mono"
                autoFocus
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy || !canDelete}>
            {busy ? 'Deleting…' : 'Delete forever'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
