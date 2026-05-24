'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { AdminUserDto } from '@open-meet/types';

import { DataTable } from '@open-meet/ui/data-table';
import { DeleteUserDialog } from '@/features/users/components/delete-user-dialog';
import { EditUserDialog } from '@/features/users/components/edit-user-dialog';
import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { useAdminUsers } from '@/features/users/hooks/use-admin-users';

const PAGE_SIZE = 20;

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const column = createColumnHelper<AdminUserDto>();

export default function AdminUsersPage() {
  const t = useTranslations('users');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminUserDto | null>(null);
  const [deleting, setDeleting] = useState<AdminUserDto | null>(null);

  const query = { page, pageSize: PAGE_SIZE, search: search.trim() || undefined };
  const { data, isLoading, isFetching } = useAdminUsers(query);

  const columns = useMemo(
    () => [
      column.display({
        id: 'user',
        header: t('table.user'),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar user={row.original} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.original.name}</p>
              <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      }),
      column.accessor('createdAt', {
        header: t('table.joined'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{formatJoined(info.getValue())}</span>
        ),
      }),
      column.accessor('meetingsHosted', {
        header: () => <span className="block text-end">{t('table.hosted')}</span>,
        cell: (info) => <span className="block text-end tabular-nums">{info.getValue()}</span>,
      }),
      column.accessor('meetingsAttended', {
        header: () => <span className="block text-end">{t('table.attended')}</span>,
        cell: (info) => <span className="block text-end tabular-nums">{info.getValue()}</span>,
      }),
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}>
              <Pencil className="h-4 w-4" />
              {t('table.edit')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleting(row.original)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t('table.delete')}
            </Button>
          </div>
        ),
      }),
    ],
    [t],
  );

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  return (
    <main className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
          <span className="text-sm text-muted-foreground">
            {t('total-count', { count: total })}
          </span>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('search-placeholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        {isFetching && !isLoading ? (
          <span className="text-xs text-muted-foreground">{t('refreshing')}</span>
        ) : null}
      </div>

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={search ? t('empty-search', { query: search }) : t('empty')}
      />

      <footer className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {total === 0 ? t('pagination.no-results') : t('pagination.showing', { from, to, total })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('pagination.previous')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t('pagination.page-of', { page, pageCount })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount || isFetching}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            {t('pagination.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
      <DeleteUserDialog user={deleting} onClose={() => setDeleting(null)} />
    </main>
  );
}
