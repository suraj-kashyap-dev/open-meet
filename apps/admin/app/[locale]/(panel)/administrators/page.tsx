'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { Crown, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { AdminAccountDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import { DataTable } from '@open-meet/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { UserAvatar } from '@open-meet/ui/user-avatar';
import { CreateAdminDialog } from '@/features/accounts/components/create-admin-dialog';
import { EditAdminDialog } from '@/features/accounts/components/edit-admin-dialog';
import { InviteAdminDialog } from '@/features/accounts/components/invite-admin-dialog';
import { PendingInvites } from '@/features/accounts/components/pending-invites';
import {
  useAdminAccounts,
  useDeleteAdminAccount,
} from '@/features/accounts/hooks/use-admin-accounts';
import { useCurrentAdmin } from '@/features/auth/hooks/use-admin-auth';
import { ApiClientError } from '@/lib/api/client';

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatLastLogin(iso: string | null, neverLabel: string): string {
  if (!iso) {
    return neverLabel;
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const column = createColumnHelper<AdminAccountDto>();

export default function AdministratorsPage() {
  const t = useTranslations('accounts');
  const { data, isLoading } = useAdminAccounts();
  const { data: currentAdmin } = useCurrentAdmin();
  const remove = useDeleteAdminAccount();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccountDto | null>(null);
  const [deleting, setDeleting] = useState<AdminAccountDto | null>(null);

  const isSuperadmin = currentAdmin?.role === 'SUPERADMIN';

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

  const columns = useMemo(() => {
    const base = [
      column.display({
        id: 'admin',
        header: t('table.administrator'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar user={{ name: row.original.name, avatar: row.original.avatar }} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.original.name}</p>
              <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      }),
      column.accessor('role', {
        header: t('table.role'),
        cell: (info) => {
          const role = info.getValue();
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                role === 'SUPERADMIN'
                  ? 'border-warning/30 bg-warning/10 text-warning'
                  : 'border-border bg-muted text-muted-foreground',
              )}
            >
              {role === 'SUPERADMIN' ? <Crown className="h-3 w-3" /> : null}
              {role === 'SUPERADMIN' ? t('roles.superadmin') : t('roles.admin')}
            </span>
          );
        },
      }),
      column.accessor('createdAt', {
        header: t('table.joined'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{formatJoined(info.getValue())}</span>
        ),
        meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
      }),
      column.accessor('lastLoginAt', {
        header: t('table.last-login'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {formatLastLogin(info.getValue(), t('table.never'))}
          </span>
        ),
        meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell' },
      }),
    ];

    if (!isSuperadmin) {
      return base;
    }

    return [
      ...base,
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(row.original)}
              aria-label={t('table.edit')}
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">{t('table.edit')}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleting(row.original)}
              aria-label={t('table.delete')}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('table.delete')}</span>
            </Button>
          </div>
        ),
      }),
    ];
  }, [isSuperadmin, t]);

  const total = data?.items.length ?? 0;

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>

          {isSuperadmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('invite-button')}
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {t('create-button')}
              </Button>
            </div>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{t('access-summary', { count: total })}</p>
      </header>

      <section className="space-y-4">
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('empty')}
        />
      </section>

      {isSuperadmin ? (
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

      <CreateAdminDialog open={createOpen} onClose={() => setCreateOpen(false)} />
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
