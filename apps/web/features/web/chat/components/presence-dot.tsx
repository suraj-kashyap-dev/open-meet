'use client';

import type { PresenceStatus } from '@open-meet/types';

import { cn } from '@open-meet/ui/cn';

import { STATUS_COLOR } from '../lib/presence-color';
import { effectivePresenceStatus } from '../lib/presence';
import { useChatStore } from '../stores';

export function PresenceDot({ userId, className }: { userId: string; className?: string }) {
  const entry = useChatStore((s) => s.presenceByUser[userId]);
  const status: PresenceStatus = effectivePresenceStatus(entry);

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
