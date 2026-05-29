import type { PresenceStatus } from '@open-meet/types';

export interface PresenceLike {
  online: boolean;
  status: PresenceStatus | null;
  customText: string | null;
  lastSeen: string | null;
}

export function effectivePresenceStatus(presence?: PresenceLike | null): PresenceStatus {
  if (!presence?.online) {
    return 'OFFLINE';
  }

  return presence.status ?? 'AVAILABLE';
}

export function formatPresenceLabel(
  presence: PresenceLike | null | undefined,
  t: (key: string, values?: Record<string, string>) => string,
  options?: { formattedLastSeen?: string; shortLastSeen?: boolean },
): string {
  const status = effectivePresenceStatus(presence);

  if (status !== 'OFFLINE') {
    return t(`presence.${status.toLowerCase()}`);
  }

  if (presence?.lastSeen) {
    if (options?.shortLastSeen) {
      return t('presence.last-seen-short');
    }

    if (options?.formattedLastSeen) {
      return t('presence.last-seen', { time: options.formattedLastSeen });
    }
  }

  return t('presence.offline');
}
