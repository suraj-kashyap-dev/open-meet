'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { AdminGroupDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import { DataTable } from '@open-meet/ui/data-table';

import { useAdminGroups, useDeleteGroup } from '@/features/groups/hooks/use-admin-groups';
import { Link, useRouter } from '@/i18n/navigation';

const column = createColumnHelper<AdminGroupDto>();

export default function AdminGroupsPage() {
  const t = useTranslations('groups');
  const router = useRouter();
  const { data, isLoading } = useAdminGroups();
  const del = useDeleteGroup();

  const columns = useMemo(
    () => [
      column.accessor('title', {
        header: t('columns.name'),
        cell: ({ row }) => (
          <Link
            href={`/groups/${row.original.id}`}
            className="font-medium text-foreground transition-colors hover:text-foreground/70"
          >
            {row.original.title}
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
              onClick={() => router.push(`/groups/${row.original.id}`)}
            >
              <Pencil className="h-4 w-4" />
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
          <Button onClick={() => router.push('/groups/new')} className="gap-2">
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
    </main>
  );
}
