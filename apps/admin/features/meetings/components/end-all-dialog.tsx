'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('meetings.end-all-dialog');
  const bulkEnd = useBulkEndActiveMeetings();
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    setBusy(true);

    try {
      const { ended } = await bulkEnd.mutateAsync();

      toast.success(t('success', { count: ended }));

      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('error');

      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {activeCount > 0 ? t('active-summary', { count: activeCount }) : t('none-active')}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy || activeCount === 0}>
            {busy ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
