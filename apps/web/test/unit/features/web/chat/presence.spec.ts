import { describe, expect, it } from 'vitest';

import { effectivePresenceStatus, formatPresenceLabel } from '@/features/web/chat/lib/presence';
import { SELF_STATUS_OPTIONS } from '@/features/web/chat/lib/presence-color';

describe('presence helpers', () => {
  const t = (key: string, values?: Record<string, string>) => {
    if (key === 'presence.last-seen') {
      return `Last seen ${values?.time}`;
    }

    if (key === 'presence.last-seen-short') {
      return 'Last seen recently';
    }

    const table: Record<string, string> = {
      'presence.available': 'Available',
      'presence.busy': 'Busy',
      'presence.dnd': 'Do not disturb',
      'presence.brb': 'Be right back',
      'presence.away': 'Away',
      'presence.offline': 'Offline',
    };

    return table[key] ?? key;
  };

  it('should treat non-online entries as offline regardless of stored status', () => {
    expect(
      effectivePresenceStatus({
        online: false,
        status: 'BUSY',
        customText: null,
        lastSeen: '2026-05-28T10:00:00.000Z',
      }),
    ).toBe('OFFLINE');
  });

  it('should expose the full backend-supported self-status list', () => {
    expect(SELF_STATUS_OPTIONS).toEqual([
      'AVAILABLE',
      'BUSY',
      'DND',
      'BRB',
      'AWAY',
      'OFFLINE',
    ]);
  });

  it('should format explicit online states by their actual status', () => {
    expect(
      formatPresenceLabel(
        { online: true, status: 'BUSY', customText: null, lastSeen: null },
        t,
      ),
    ).toBe('Busy');
  });

  it('should use last-seen text for offline users when available', () => {
    expect(
      formatPresenceLabel(
        {
          online: false,
          status: 'OFFLINE',
          customText: null,
          lastSeen: '2026-05-28T10:00:00.000Z',
        },
        t,
        { formattedLastSeen: '10:00 AM' },
      ),
    ).toBe('Last seen 10:00 AM');
  });

  it('should support the compact last-seen variant', () => {
    expect(
      formatPresenceLabel(
        {
          online: false,
          status: 'OFFLINE',
          customText: null,
          lastSeen: '2026-05-28T10:00:00.000Z',
        },
        t,
        { shortLastSeen: true },
      ),
    ).toBe('Last seen recently');
  });
});
