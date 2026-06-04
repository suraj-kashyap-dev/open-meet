'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Mail, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { AdminUserDto } from '@open-meet/types';

import { DataTable } from '@open-meet/ui/data-table';
import { CreateUserDialog } from '@/features/users/components/create-user-dialog';
import { DeleteUserDialog } from '@/features/users/components/delete-user-dialog';
import { EditUserDialog } from '@/features/users/components/edit-user-dialog';
import { InviteUserDialog } from '@/features/users/components/invite-user-dialog';
import { PendingUserInvites } from '@/features/users/components/pending-user-invites';
import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { Switch } from '@open-meet/ui/switch';
import { useAdminUsers, useUpdateAdminUser } from '@/features/users/hooks/use-admin-users';

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const query = { page, pageSize: PAGE_SIZE, search: search.trim() || undefined };
  const { data, isLoading, isFetching } = useAdminUsers(query);
  const updateUser = useUpdateAdminUser();

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
        meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
      }),
      column.display({
        id: 'chat',
        header: () => <span className="block text-center">{t('table.chat')}</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Switch
              checked={!row.original.chatDisabled}
              disabled={updateUser.isPending}
              aria-label={t('table.chat-toggle')}
              onCheckedChange={(enabled) =>
                updateUser.mutate({ id: row.original.id, body: { chatDisabled: !enabled } })
              }
            />
          </div>
        ),
        meta: { headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell' },
      }),
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
    ],
    [t, updateUser],
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {t('total-count', { count: total })}
            </span>
            <Button variant="outline" onClick={() => setInviteOpen(true)} className="gap-2">
              <Mail className="h-4 w-4" />
              {t('invite.button')}
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {t('create-dialog.button')}
            </Button>
          </div>
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

      <footer className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-muted-foreground sm:text-start">
          {total === 0 ? t('pagination.no-results') : t('pagination.showing', { from, to, total })}
        </p>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
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

      <section className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        <h2 className="text-sm font-semibold">{t('pending.title')}</h2>

        <PendingUserInvites />
      </section>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditUserDialog user={editing} onClose={() => setEditing(null)} />

      <DeleteUserDialog user={deleting} onClose={() => setDeleting(null)} />
    </main>
  );
}
