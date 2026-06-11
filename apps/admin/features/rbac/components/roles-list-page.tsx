'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import type { DatagridColumnDto, RoleDto } from '@open-meet/types';
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
import { useDeleteAdminRole } from '@/features/rbac/hooks/use-admin-roles';
import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

type RoleRow = Record<string, unknown>;

export function RolesListPage() {
  const t = useTranslations('rbac');
  const router = useRouter();
  const remove = useDeleteAdminRole();
  const [deleting, setDeleting] = useState<RoleDto | null>(null);

  const onConfirmDelete = async () => {
    if (!deleting) {
      return;
    }

    try {
      await remove.mutateAsync(deleting.id);

      toast.success(t('delete.success', { name: deleting.name }));

      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('delete.error'));
    }
  };

  const renderCell = (column: DatagridColumnDto, row: RoleRow) => {
    if (column.key === 'permissions') {
      return String((row.permissions as string[] | undefined)?.length ?? 0);
    }

    if (column.key === 'system') {
      return (
        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {row.system ? t('table.system') : t('type.custom')}
        </span>
      );
    }

    return undefined;
  };

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('title.admin-roles')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('subtitle.admin-roles')}</p>
      </header>

      <section className="space-y-4">
        <DataGrid
          resource="roles"
          emptyMessage={t('table.empty')}
          renderCell={renderCell}
          onAction={(key, row) => {
            if (key === 'create') {
              router.push('/roles/new');
            } else if (key === 'edit' && row) {
              router.push(`/roles/${String(row.id)}`);
            } else if (key === 'delete' && row) {
              setDeleting(row as unknown as RoleDto);
            }
          }}
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
            <Button
              variant="destructive"
              onClick={() => void onConfirmDelete()}
              disabled={remove.isPending}
            >
              {t('delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
