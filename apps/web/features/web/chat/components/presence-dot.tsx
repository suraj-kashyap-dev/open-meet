'use client';

import type { PresenceStatus } from '@open-meet/types';

import { cn } from '@open-meet/ui/cn';

import { useChatStore } from '../stores';

const STATUS_COLOR: Record<PresenceStatus, string> = {
  AVAILABLE: 'bg-emerald-500',
  BUSY: 'bg-rose-500',
  DND: 'bg-rose-600',
  BRB: 'bg-amber-500',
  AWAY: 'bg-amber-400',
  OFFLINE: 'bg-muted-foreground/40',
};

export function PresenceDot({ userId, className }: { userId: string; className?: string }) {
  const entry = useChatStore((s) => s.presenceByUser[userId]);
  const status: PresenceStatus = entry?.online ? (entry.status ?? 'AVAILABLE') : 'OFFLINE';

  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full ring-2 ring-card',
        STATUS_COLOR[status],
        className,
      )}
    />
  );
}
