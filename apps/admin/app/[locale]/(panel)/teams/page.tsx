'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { AdminTeamDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import { DataTable } from '@open-meet/ui/data-table';

import { CreateTeamDialog } from '@/features/teams/components/create-team-dialog';
import { useAdminTeams, useDeleteTeam } from '@/features/teams/hooks/use-admin-teams';
import { Link, useRouter } from '@/i18n/navigation';

const column = createColumnHelper<AdminTeamDto>();

export default function AdminTeamsPage() {
  const t = useTranslations('teams');
  const router = useRouter();
  const { data, isLoading } = useAdminTeams();
  const del = useDeleteTeam();
  const [createOpen, setCreateOpen] = useState(false);

  const columns = useMemo(
    () => [
      column.accessor('name', {
        header: t('columns.name'),
        cell: ({ row }) => (
          <Link
            href={`/teams/${row.original.id}`}
            className="font-medium text-foreground transition-colors hover:text-foreground/70"
          >
            {row.original.name}
          </Link>
        ),
      }),
      column.accessor('memberCount', {
        header: t('columns.members'),
        cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span>,
      }),
      column.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('actions.manage')}
              onClick={() => router.push(`/teams/${row.original.id}`)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              aria-label={t('actions.delete')}
              disabled={del.isPending}
              onClick={() => del.mutate(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [t, del, router],
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
    </main>
  );
}
