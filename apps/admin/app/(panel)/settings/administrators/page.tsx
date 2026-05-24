'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { Crown, MoreHorizontal, Plus } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { UserAvatar } from '@open-meet/ui/user-avatar';
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

function formatLastLogin(iso: string | null): string {
  if (!iso) {
    return 'never';
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
  const { data, isLoading } = useAdminAccounts();
  const { data: currentAdmin } = useCurrentAdmin();
  const remove = useDeleteAdminAccount();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccountDto | null>(null);
  const [deleting, setDeleting] = useState<AdminAccountDto | null>(null);

  const isSuperadmin = currentAdmin?.role === 'SUPERADMIN';

  const onConfirmDelete = async () => {
    if (!deleting) {
      return;
    }

    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`Deleted ${deleting.name}`);
      setDeleting(null);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not delete admin';
      toast.error(message);
    }
  };

  const columns = useMemo(() => {
    const base = [
      column.display({
        id: 'admin',
        header: 'Administrator',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <UserAvatar user={{ name: row.original.name }} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.original.name}</p>
              <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      }),
      column.accessor('role', {
        header: 'Role',
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
              {role.toLowerCase()}
            </span>
          );
        },
      }),
      column.accessor('createdAt', {
        header: 'Joined',
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{formatJoined(info.getValue())}</span>
        ),
      }),
      column.accessor('lastLoginAt', {
        header: 'Last login',
        cell: (info) => (
          <span className="text-sm text-muted-foreground">{formatLastLogin(info.getValue())}</span>
        ),
      }),
    ];

    if (!isSuperadmin) {
      return base;
    }

    return [
      ...base,
      column.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={`Actions for ${row.original.name}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(row.original)}>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setDeleting(row.original)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      }),
    ];
  }, [isSuperadmin]);

  const total = data?.items.length ?? 0;

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Settings
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Administrators</h1>

          {isSuperadmin ? (
            <Button onClick={() => setInviteOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Invite admin
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? 'person has' : 'people have'} access to this
          console.
        </p>
      </header>

      <section className="space-y-4">
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No administrators yet."
        />
      </section>

      {isSuperadmin ? (
        <section className="space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight">Pending invites</h2>
            <p className="text-sm text-muted-foreground">
              Invites that haven&apos;t been accepted yet. Resend the email or revoke access.
            </p>
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
            <DialogTitle>Delete this admin?</DialogTitle>
            <DialogDescription>
              {deleting?.name} ({deleting?.email}) will lose access to the admin console
              immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={remove.isPending}>
              {remove.isPending ? 'Deleting…' : 'Delete admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
