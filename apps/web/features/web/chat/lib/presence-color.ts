import type { PresenceStatus } from '@open-meet/types';

/** Color mapping for every PresenceStatus the server may emit — kept complete
 * (incl. BRB/DND) so peer-incoming dots still render correctly, even though
 * the user's own picker only exposes 4 options. */
export const STATUS_COLOR: Record<PresenceStatus, string> = {
  AVAILABLE: 'bg-emerald-500',
  BUSY: 'bg-rose-500',
  DND: 'bg-rose-600',
  BRB: 'bg-amber-500',
  AWAY: 'bg-amber-400',
  OFFLINE: 'bg-muted-foreground/40',
};

/** The 4 statuses the user can set on themselves (BRB/DND removed per UX). */
export const SELF_STATUS_OPTIONS = ['AVAILABLE', 'BUSY', 'AWAY', 'OFFLINE'] as const;
export type SelfStatus = (typeof SELF_STATUS_OPTIONS)[number];
