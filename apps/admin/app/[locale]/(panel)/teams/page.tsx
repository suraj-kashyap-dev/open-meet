'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { AdminTeamDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import { DataTable } from '@open-meet/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';

import { CreateTeamDialog } from '@/features/teams/components/create-team-dialog';
import { EditTeamDialog } from '@/features/teams/components/edit-team-dialog';
import { useAdminTeams, useDeleteTeam } from '@/features/teams/hooks/use-admin-teams';
import { ApiClientError } from '@/lib/api/client';

const column = createColumnHelper<AdminTeamDto>();

export default function AdminTeamsPage() {
  const t = useTranslations('teams');
  const { data, isLoading } = useAdminTeams();
  const del = useDeleteTeam();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTeamDto | null>(null);
  const [deleting, setDeleting] = useState<AdminTeamDto | null>(null);

  const onConfirmDelete = async () => {
    if (! deleting) {
      return;
    }

    try {
      await del.mutateAsync(deleting.id);

      toast.success(t('detail.delete-success'));
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('detail.delete-error'));
    }
  };

  const columns = useMemo(
    () => [
      column.accessor('name', {
        header: t('columns.name'),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setEditing(row.original)}
            className="font-medium text-foreground transition-colors hover:text-foreground/70"
          >
            {row.original.name}
          </button>
        ),
      }),
      column.accessor('memberCount', {
        header: t('columns.members'),
        cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span>,
      }),
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('actions.manage')}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label={t('actions.manage')}
              onClick={() => setEditing(row.original)}
            >
              <Pencil className="h-4 w-4" />

              <span className="hidden sm:inline">{t('actions.manage')}</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              aria-label={t('actions.delete')}
              onClick={() => setDeleting(row.original)}
            >
              <Trash2 className="h-4 w-4" />
              
              <span className="hidden sm:inline">{t('actions.delete')}</span>
            </Button>
          </div>
        ),
      }),
    ],
    [t],
  );

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>

          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />

            {t('create.button')}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="space-y-4">
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={t('empty')}
        />
      </section>

      <CreateTeamDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditTeamDialog team={editing} onClose={() => setEditing(null)} />

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => (!o && !del.isPending ? setDeleting(null) : undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete-dialog.title')}</DialogTitle>

            <DialogDescription>
              {t('delete-dialog.description', { name: deleting?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={del.isPending}>
              {t('delete-dialog.cancel')}
            </Button>

            <Button variant="destructive" onClick={() => void onConfirmDelete()} disabled={del.isPending}>
              {del.isPending ? t('delete-dialog.deleting') : t('delete-dialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
