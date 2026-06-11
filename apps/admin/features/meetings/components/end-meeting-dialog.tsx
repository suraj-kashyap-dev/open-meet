'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
import { useForceEndMeeting } from '@/features/meetings/hooks/use-admin-meetings';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  meeting: AdminMeetingDto | null;
  onClose: () => void;
}

export function EndMeetingDialog({ meeting, onClose }: Props) {
  const t = useTranslations('meetings.end-dialog');
  const forceEnd = useForceEndMeeting();
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    if (!meeting) {
      return;
    }

    setBusy(true);

    try {
      await forceEnd.mutateAsync(meeting.id);

      toast.success(t('success', { code: meeting.code }));

      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('error');

      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const activeCount = meeting?.activeParticipantCount ?? 0;

  return (
    <Dialog open={Boolean(meeting)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {activeCount > 0
              ? t('description-active', { count: activeCount })
              : t('description-idle')}
          </DialogDescription>
        </DialogHeader>

        {meeting ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <p className="break-words">
              <span className="font-mono">{meeting.code}</span>
              {meeting.title ? ` · ${meeting.title}` : null}
            </p>
            <p className="mt-0.5 break-words">{t('hosted-by', { host: meeting.hostName })}</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
