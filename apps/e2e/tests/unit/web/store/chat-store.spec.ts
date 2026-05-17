import { beforeEach, describe, expect, it } from 'vitest';

import type { MessageDto } from '@open-meet/types';

import { useChatStore } from '@/features/web/meeting/stores/chat-store';

function makeMessage(overrides: Partial<MessageDto> = {}): MessageDto {
  return {
    id: 'm-1',
    meetingId: 'meeting-1',
    content: 'hello',
    sentAt: new Date().toISOString(),
    sender: { id: 'user-1', name: 'Ada' },
    attachments: [],
    ...overrides,
  } as MessageDto;
}

describe('chat-store', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('starts empty and closed', () => {
    const s = useChatStore.getState();
    expect(s.messages).toEqual([]);
    expect(s.unread).toBe(0);
    expect(s.isOpen).toBe(false);
    expect(s.reactions).toEqual([]);
  });

  it('add increments unread when the panel is closed', () => {
    useChatStore.getState().add(makeMessage({ id: 'a' }));
    useChatStore.getState().add(makeMessage({ id: 'b' }));

    const s = useChatStore.getState();
    expect(s.messages.map((m) => m.id)).toEqual(['a', 'b']);
    expect(s.unread).toBe(2);
  });

  it('add does NOT increment unread when the panel is open', () => {
    useChatStore.getState().setOpen(true);
    useChatStore.getState().add(makeMessage({ id: 'a' }));
    useChatStore.getState().add(makeMessage({ id: 'b' }));

    expect(useChatStore.getState().unread).toBe(0);
  });

  it('setOpen(true) clears the unread counter', () => {
    useChatStore.getState().add(makeMessage());
    useChatStore.getState().add(makeMessage());
    expect(useChatStore.getState().unread).toBe(2);

    useChatStore.getState().setOpen(true);
    expect(useChatStore.getState().unread).toBe(0);
    expect(useChatStore.getState().isOpen).toBe(true);
  });

  it('setOpen(false) preserves the unread counter', () => {
    useChatStore.getState().add(makeMessage());
    useChatStore.getState().setOpen(false);
    expect(useChatStore.getState().unread).toBe(1);
  });

  it('pushReaction appends with a unique id, clearReaction removes by id', () => {
    useChatStore.getState().pushReaction('👍', 'Ada');
    useChatStore.getState().pushReaction('🎉', 'Linus');

    const before = useChatStore.getState().reactions;
    expect(before).toHaveLength(2);
    expect(new Set(before.map((r) => r.id)).size).toBe(2);

    useChatStore.getState().clearReaction(before[0]!.id);

    const after = useChatStore.getState().reactions;
    expect(after).toHaveLength(1);
    expect(after[0]!.emoji).toBe('🎉');
  });

  it('reset clears messages, unread, isOpen, and reactions', () => {
    useChatStore.getState().add(makeMessage());
    useChatStore.getState().pushReaction('👍', 'Ada');
    useChatStore.getState().setOpen(true);

    useChatStore.getState().reset();

    const s = useChatStore.getState();
    expect(s.messages).toEqual([]);
    expect(s.unread).toBe(0);
    expect(s.isOpen).toBe(false);
    expect(s.reactions).toEqual([]);
  });
});
