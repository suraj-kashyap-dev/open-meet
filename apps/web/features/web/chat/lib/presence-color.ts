import type { PresenceStatus } from '@open-meet/types';

/** Color mapping for every PresenceStatus the server may emit - kept complete
 * (incl. BRB/DND) so all peer and self status states render consistently. */
export const STATUS_COLOR: Record<PresenceStatus, string> = {
  AVAILABLE: 'bg-emerald-500',
  BUSY: 'bg-rose-500',
  DND: 'bg-rose-600',
  BRB: 'bg-amber-500',
  AWAY: 'bg-amber-400',
  OFFLINE: 'bg-muted-foreground/40',
};

/** Full self-settable status list, aligned with the backend enum. */
export const SELF_STATUS_OPTIONS = ['AVAILABLE', 'BUSY', 'DND', 'BRB', 'AWAY', 'OFFLINE'] as const;
export type SelfStatus = (typeof SELF_STATUS_OPTIONS)[number];
