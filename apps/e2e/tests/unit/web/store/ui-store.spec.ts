import { beforeEach, describe, expect, it } from 'vitest';

import { useUIStore } from '@/stores/ui-store';

describe('ui-store', () => {
  beforeEach(() => {
    useUIStore.getState().setParticipantsOpen(false);
  });

  it('starts with the participants panel closed', () => {
    expect(useUIStore.getState().participantsOpen).toBe(false);
  });

  it('toggleParticipants flips the value each call', () => {
    useUIStore.getState().toggleParticipants();
    expect(useUIStore.getState().participantsOpen).toBe(true);

    useUIStore.getState().toggleParticipants();
    expect(useUIStore.getState().participantsOpen).toBe(false);
  });

  it('setParticipantsOpen forces the given value', () => {
    useUIStore.getState().setParticipantsOpen(true);
    expect(useUIStore.getState().participantsOpen).toBe(true);

    useUIStore.getState().setParticipantsOpen(true);
    expect(useUIStore.getState().participantsOpen).toBe(true);

    useUIStore.getState().setParticipantsOpen(false);
    expect(useUIStore.getState().participantsOpen).toBe(false);
  });
});
