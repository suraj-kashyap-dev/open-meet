'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { AdminUserDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { useDeleteAdminUser } from '@/features/users/hooks/use-admin-users';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  user: AdminUserDto | null;
  onClose: () => void;
  /** Called after a successful deletion, in addition to onClose (e.g. to navigate away). */
  onDeleted?: () => void;
}

export function DeleteUserDialog({ user, onClose, onDeleted }: Props) {
  const t = useTranslations('users.delete-dialog');
  const del = useDeleteAdminUser();
  const open = user !== null;
  const pending = del.isPending;

  const onConfirm = async () => {
    if (!user) {
      return;
    }

    try {
      await del.mutateAsync(user.id);
      toast.success(t('success', { email: user.email }));
      onClose();
      onDeleted?.();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('error');
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t.rich('description', {
              email: user?.email ?? '',
              strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            })}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
