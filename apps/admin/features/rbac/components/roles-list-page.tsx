'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { RoleDto } from '@open-meet/types';
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

import { useAdminRoles, useDeleteAdminRole } from '@/features/rbac/hooks/use-admin-roles';
import { useCan } from '@/features/auth/hooks/use-admin-auth';
import { Link } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

const column = createColumnHelper<RoleDto>();

export function RolesListPage() {
  const t = useTranslations('rbac');
  const { data, isLoading } = useAdminRoles();
  const canCreate = useCan('roles.create');
  const canUpdate = useCan('roles.update');
  const canDelete = useCan('roles.delete');
  const remove = useDeleteAdminRole();
  const [deleting, setDeleting] = useState<RoleDto | null>(null);

  const onConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(t('delete.success', { name: deleting.name }));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('delete.error'));
    }
  };

  const columns = useMemo(() => {
    const base = [
      column.accessor('name', {
        header: t('table.name'),
        cell: (info) => (
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{info.getValue()}</span>
            {info.row.original.isSystem ? (
              <span className="rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                {t('table.system')}
              </span>
            ) : null}
          </div>
        ),
      }),
      column.accessor('description', {
        header: t('table.description'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground line-clamp-1">
            {info.getValue() ?? '-'}
          </span>
        ),
        meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
      }),
      column.accessor('permissionType', {
        header: t('table.type'),
        cell: (info) => (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              info.getValue() === 'ALL'
                ? 'border-warning/30 bg-warning/10 text-warning'
                : 'border-border bg-muted text-muted-foreground',
            )}
          >
            {t(info.getValue() === 'ALL' ? 'type.all' : 'type.custom')}
          </span>
        ),
      }),
      column.accessor('memberCount', {
        header: t('table.members'),
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
    ];

    if (!canUpdate && !canDelete) return base;

    return [
      ...base,
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {canUpdate ? (
              <Button size="sm" variant="ghost" asChild aria-label={t('table.edit')}>
                <Link href={`/roles/${row.original.id}`}>
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('table.edit')}</span>
                </Link>
              </Button>
            ) : null}
            {canDelete && !row.original.isSystem ? (
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
            ) : null}
          </div>
        ),
      }),
    ];
  }, [canUpdate, canDelete, t]);

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('title.admin-roles')}
          </h1>
          {canCreate ? (
            <Button asChild className="gap-2">
              <Link href="/roles/new">
                <Plus className="h-4 w-4" />
                {t('create.submit')}
              </Link>
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle.admin-roles')}</p>
      </header>

      <section className="space-y-4">
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('table.empty')}
        />
      </section>

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => (!o ? setDeleting(null) : null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t('delete.description', { count: deleting?.memberCount ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={remove.isPending}>
              {t('delete.cancel')}
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={remove.isPending}>
              {t('delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
