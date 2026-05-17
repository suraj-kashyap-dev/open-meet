import { beforeEach, describe, expect, it } from 'vitest';

import type { MeetingDto, PresenceDto } from '@open-meet/types';

import { useMeetingStore } from '@/features/web/meeting/stores/meeting-store';

function makePresence(overrides: Partial<PresenceDto> = {}): PresenceDto {
  return {
    userId: 'u-1',
    name: 'Ada',
    online: true,
    ...overrides,
  } as PresenceDto;
}

describe('meeting-store', () => {
  beforeEach(() => {
    useMeetingStore.getState().reset();
  });

  it('starts empty', () => {
    const s = useMeetingStore.getState();
    expect(s.meeting).toBeNull();
    expect(s.raisedHands).toEqual({});
    expect(s.presence).toEqual({});
  });

  it('setMeeting stores the meeting and accepts null', () => {
    const meeting = { id: 'm1', code: 'abc' } as MeetingDto;
    useMeetingStore.getState().setMeeting(meeting);
    expect(useMeetingStore.getState().meeting).toBe(meeting);

    useMeetingStore.getState().setMeeting(null);
    expect(useMeetingStore.getState().meeting).toBeNull();
  });

  it('raiseHand stores name + timestamp; lowerHand removes by id', () => {
    const before = Date.now();
    useMeetingStore.getState().raiseHand('u-1', 'Ada');
    const entry = useMeetingStore.getState().raisedHands['u-1'];

    expect(entry?.name).toBe('Ada');
    expect(entry?.at).toBeGreaterThanOrEqual(before);

    useMeetingStore.getState().lowerHand('u-1');
    expect(useMeetingStore.getState().raisedHands['u-1']).toBeUndefined();
  });

  it('upsertPresence inserts new and overwrites existing by userId', () => {
    useMeetingStore.getState().upsertPresence(makePresence({ userId: 'u-1', name: 'Ada' }));
    useMeetingStore.getState().upsertPresence(makePresence({ userId: 'u-2', name: 'Linus' }));

    expect(Object.keys(useMeetingStore.getState().presence).sort()).toEqual(['u-1', 'u-2']);

    useMeetingStore
      .getState()
      .upsertPresence(makePresence({ userId: 'u-1', name: 'Ada Lovelace' }));

    expect(useMeetingStore.getState().presence['u-1']?.name).toBe('Ada Lovelace');
  });

  it('removePresence drops only the given user', () => {
    useMeetingStore.getState().upsertPresence(makePresence({ userId: 'u-1' }));
    useMeetingStore.getState().upsertPresence(makePresence({ userId: 'u-2' }));

    useMeetingStore.getState().removePresence('u-1');

    expect(useMeetingStore.getState().presence['u-1']).toBeUndefined();
    expect(useMeetingStore.getState().presence['u-2']).toBeDefined();
  });

  it('reset clears meeting + hands + presence', () => {
    useMeetingStore.getState().setMeeting({ id: 'm' } as MeetingDto);
    useMeetingStore.getState().raiseHand('u-1', 'Ada');
    useMeetingStore.getState().upsertPresence(makePresence());

    useMeetingStore.getState().reset();

    const s = useMeetingStore.getState();
    expect(s.meeting).toBeNull();
    expect(s.raisedHands).toEqual({});
    expect(s.presence).toEqual({});
  });
});
