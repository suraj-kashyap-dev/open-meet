'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { AdminMeetingDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { useDeleteAdminMeeting } from '@/features/meetings/hooks/use-admin-meetings';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  meeting: AdminMeetingDto | null;
  onClose: () => void;
}

export function DeleteMeetingDialog({ meeting, onClose }: Props) {
  const t = useTranslations('meetings.delete-dialog');
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
      toast.success(t('success', { code: meeting.code }));
      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('error');
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(meeting)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {meeting ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <p className="break-words">
                <span className="font-mono">{meeting.code}</span>
                {meeting.title ? ` · ${meeting.title}` : null}
              </p>
              <p className="mt-0.5">
                {t('summary', {
                  participants: meeting.participantCount,
                  messages: meeting.messageCount,
                })}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-code" className="text-xs text-muted-foreground">
                {t.rich('confirm-label', {
                  code: meeting.code,
                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                })}
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
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy || !canDelete}>
            {busy ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
