import type { PresenceStatus } from '@open-meet/types';

export const STATUS_COLOR: Record<PresenceStatus, string> = {
  AVAILABLE: 'bg-emerald-500',
  BUSY: 'bg-rose-500',
  DND: 'bg-rose-600',
  BRB: 'bg-amber-500',
  AWAY: 'bg-amber-400',
  OFFLINE: 'bg-muted-foreground/40',
};

export const SELF_STATUS_OPTIONS = ['AVAILABLE', 'BUSY', 'DND', 'BRB', 'AWAY', 'OFFLINE'] as const;
export type SelfStatus = (typeof SELF_STATUS_OPTIONS)[number];
