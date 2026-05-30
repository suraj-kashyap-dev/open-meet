'use client';

import { Mail, RotateCw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import type { AdminInviteDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import {
  useAdminInvites,
  useResendAdminInvite,
  useRevokeAdminInvite,
} from '@/features/accounts/hooks/use-admin-accounts';
import { ApiClientError } from '@/lib/api/client';

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PendingInvites() {
  const t = useTranslations('accounts');
  const { data, isLoading, error } = useAdminInvites();
  const resend = useResendAdminInvite();
  const revoke = useRevokeAdminInvite();
  const [busyId, setBusyId] = useState<string | null>(null);

  const invites = data?.items ?? [];

  const onResend = async (invite: AdminInviteDto) => {
    setBusyId(invite.id);
    try {
      await resend.mutateAsync(invite.id);
      toast.success(t('pending.resend-success', { email: invite.email }));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('pending.resend-error'));
    } finally {
      setBusyId(null);
    }
  };

  const onRevoke = async (invite: AdminInviteDto) => {
    setBusyId(invite.id);
    try {
      await revoke.mutateAsync(invite.id);
      toast.success(t('pending.revoke-success', { email: invite.email }));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('pending.revoke-error'));
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-16 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{t('pending.loading-error')}</p>;
  }

  if (invites.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t('pending.empty')}</p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {invites.map((invite) => {
        const expired = invite.status === 'EXPIRED';
        const busy = busyId === invite.id;

        return (
          <li key={invite.id} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Mail className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{invite.name}</p>
                <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {invite.role?.name ?? '—'}
                </span>
                <span
                  className={cn(
                    'rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                    expired
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {expired ? t('pending.status-expired') : t('pending.status-pending')}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{invite.email}</p>
            </div>

            <p className="hidden text-[10px] text-muted-foreground sm:block">
              {expired
                ? t('pending.expired-at', { when: formatExpiryDate(invite.expiresAt) })
                : t('pending.expires', { when: formatExpiryDate(invite.expiresAt) })}
            </p>

            <Button
              variant="ghost"
              size="icon"
              aria-label={t('pending.resend-label', { email: invite.email })}
              disabled={busy}
              onClick={() => onResend(invite)}
            >
              <RotateCw className={cn('h-4 w-4', busy && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              aria-label={t('pending.revoke-label', { email: invite.email })}
              disabled={busy}
              onClick={() => onRevoke(invite)}
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
