'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AdminAccountDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';

import { DataGrid } from '@/components/datagrid/data-grid';
import { EditAdminDialog } from '@/features/accounts/components/edit-admin-dialog';
import { InviteAdminDialog } from '@/features/accounts/components/invite-admin-dialog';
import { PendingInvites } from '@/features/accounts/components/pending-invites';
import { useDeleteAdminAccount } from '@/features/accounts/hooks/use-admin-accounts';
import { useCan } from '@/features/auth/hooks/use-admin-auth';
import { ApiClientError } from '@/lib/api/client';

export default function AdministratorsPage() {
  const t = useTranslations('accounts');
  const canInvite = useCan('admin-accounts.invite');
  const remove = useDeleteAdminAccount();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccountDto | null>(null);
  const [deleting, setDeleting] = useState<AdminAccountDto | null>(null);

  const onConfirmDelete = async () => {
    if (!deleting) {
      return;
    }

    try {
      await remove.mutateAsync(deleting.id);

      toast.success(t('delete-dialog.success', { name: deleting.name }));

      setDeleting(null);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('delete-dialog.error');

      toast.error(message);
    }
  };

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="space-y-4">
        <DataGrid
          resource="accounts"
          emptyMessage={t('empty')}
          onAction={(key, row) => {
            if (key === 'invite') {
              setInviteOpen(true);
            } else if (key === 'edit' && row) {
              setEditing(row as unknown as AdminAccountDto);
            } else if (key === 'delete' && row) {
              setDeleting(row as unknown as AdminAccountDto);
            }
          }}
        />
      </section>

      {canInvite ? (
        <section className="space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight">{t('pending.heading')}</h2>
            <p className="text-sm text-muted-foreground">{t('pending.description')}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card px-4 shadow-sm">
            <PendingInvites />
          </div>
        </section>
      ) : null}

      <InviteAdminDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <EditAdminDialog admin={editing} onClose={() => setEditing(null)} />

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => (!o ? setDeleting(null) : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete-dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('delete-dialog.description', {
                name: deleting?.name ?? '',
                email: deleting?.email ?? '',
              })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={remove.isPending}>
              {t('delete-dialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={remove.isPending}>
              {remove.isPending ? t('delete-dialog.deleting') : t('delete-dialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
