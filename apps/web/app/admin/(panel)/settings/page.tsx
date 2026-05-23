'use client';

import { Crown, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AdminAccountDto } from '@open-meet/types';

import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InviteAdminDialog } from '@/features/admin/accounts/components/invite-admin-dialog';
import {
  useAdminAccounts,
  useDeleteAdminAccount,
} from '@/features/admin/accounts/hooks/use-admin-accounts';
import { ApiClientError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

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

export default function AdminSettingsPage() {
  const { data, isLoading, error } = useAdminAccounts();
  const remove = useDeleteAdminAccount();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminAccountDto | null>(null);

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

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Configure
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage admin accounts and workspace defaults.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight">Admin accounts</h2>
            <p className="text-sm text-muted-foreground">
              People with full access to this admin console.
            </p>
          </div>

          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Invite admin
          </Button>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">Failed to load admin accounts.</p>
          ) : (data?.items ?? []).length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No admins yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(data?.items ?? []).map((admin) => (
                <li key={admin.id} className="flex items-center gap-3 py-3">
                  <UserAvatar user={{ name: admin.name }} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{admin.name}</p>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                          admin.role === 'SUPERADMIN'
                            ? 'border-warning/30 bg-warning/10 text-warning'
                            : 'border-border bg-muted text-muted-foreground',
                        )}
                      >
                        {admin.role === 'SUPERADMIN' ? <Crown className="h-3 w-3" /> : null}
                        {admin.role.toLowerCase()}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
                  </div>

                  <div className="text-right text-[10px] text-muted-foreground">
                    <p>Joined {formatJoined(admin.createdAt)}</p>
                    <p>Last login {formatLastLogin(admin.lastLoginAt)}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    aria-label={`Delete ${admin.name}`}
                    onClick={() => setDeleting(admin)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <InviteAdminDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />

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
