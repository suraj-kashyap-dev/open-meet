'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { AdminUserDto } from '@open-meet/types';

import { UserAvatar } from '@open-meet/ui/user-avatar';

import { DataGrid } from '@/components/datagrid/data-grid';
import { CreateUserDialog } from '@/features/users/components/create-user-dialog';
import { DeleteUserDialog } from '@/features/users/components/delete-user-dialog';
import { EditUserDialog } from '@/features/users/components/edit-user-dialog';
import { InviteUserDialog } from '@/features/users/components/invite-user-dialog';
import { PendingUserInvites } from '@/features/users/components/pending-user-invites';
import { useUpdateAdminUser } from '@/features/users/hooks/use-admin-users';

export default function AdminUsersPage() {
  const t = useTranslations('users');
  const updateUser = useUpdateAdminUser();

  const [editing, setEditing] = useState<AdminUserDto | null>(null);
  const [deleting, setDeleting] = useState<AdminUserDto | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <main className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="space-y-4">
        <DataGrid
          resource="users"
          emptyMessage={t('empty')}
          renderCell={(column, row) => {
            if (column.key !== 'name') {
              return undefined;
            }
            const user = row as unknown as AdminUserDto;
            return (
              <div className="flex items-center gap-3">
                <UserAvatar user={user} size="md" />
                <span className="truncate text-sm font-medium">{user.name}</span>
              </div>
            );
          }}
          onAction={(key, row) => {
            if (key === 'create') {
              setCreateOpen(true);
            } else if (key === 'invite') {
              setInviteOpen(true);
            } else if (key === 'edit' && row) {
              setEditing(row as unknown as AdminUserDto);
            } else if (key === 'delete' && row) {
              setDeleting(row as unknown as AdminUserDto);
            } else if (key === 'toggle-chat' && row) {
              const user = row as unknown as AdminUserDto;
              updateUser.mutate({ id: user.id, body: { chatDisabled: !user.chatDisabled } });
            }
          }}
        />
      </section>

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
