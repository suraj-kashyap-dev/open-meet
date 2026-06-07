import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MentionKind } from '@open-meet/types';

import { MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import { type StorageService } from '@/storage/services/storage.service';
import { type UploadsService } from '@/modules/uploads/services/uploads.service';
import type {
  ChatMessageWithRelations,
  ConversationWithMembers,
  PollWithOptions,
} from '@/modules/client/messaging/messaging.includes';
import type { PresenceSnapshot } from '@/modules/client/messaging/services/presence.service';

function baseMessage(overrides: Partial<ChatMessageWithRelations> = {}): ChatMessageWithRelations {
  return {
    id: 'm1',
    conversationId: 'c1',
    type: 'TEXT',
    priority: 'NORMAL',
    content: 'hello world',
    sender: { id: 'u1', name: 'Alice', avatarKey: 'a/alice.png' },
    parentId: null,
    parent: null,
    replyCount: 0,
    attachments: [],
    reactions: [],
    poll: null,
    mentions: [],
    editedAt: null,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as unknown as ChatMessageWithRelations;
}

describe('MessagingSerializer', () => {
  let storage: { publicUrl: ReturnType<typeof vi.fn> };
  let uploads: { toDto: ReturnType<typeof vi.fn> };
  let serializer: MessagingSerializer;

  beforeEach(() => {
    storage = { publicUrl: vi.fn((key: string) => `https://cdn/${key}`) };
    uploads = { toDto: vi.fn((a: { id: string }) => ({ id: a.id, url: `url/${a.id}` })) };
    serializer = new MessagingSerializer(
      storage as unknown as StorageService,
      uploads as unknown as UploadsService,
    );
  });

  describe('avatar()', () => {
    it('should return null for a null key', () => {
      expect(serializer.avatar(null)).toBeNull();
      expect(storage.publicUrl).not.toHaveBeenCalled();
    });

    it('should resolve a public url for a key', () => {
      expect(serializer.avatar('a/x.png')).toBe('https://cdn/a/x.png');
    });
  });

  describe('sender()', () => {
    it('should return null when the row is null', () => {
      expect(serializer.sender(null)).toBeNull();
    });

    it('should map id, name, and resolved avatar', () => {
      expect(serializer.sender({ id: 'u1', name: 'Alice', avatarKey: 'a/x.png' })).toEqual({
        id: 'u1',
        name: 'Alice',
        avatar: 'https://cdn/a/x.png',
      });
    });

    it('should pass a null avatar through', () => {
      expect(serializer.sender({ id: 'u2', name: 'Bob', avatarKey: null })).toEqual({
        id: 'u2',
        name: 'Bob',
        avatar: null,
      });
    });
  });

  describe('reactions()', () => {
    it('should group rows by emoji with counts and userIds', () => {
      const result = serializer.reactions(
        [
          { emoji: '👍', userId: 'u1' },
          { emoji: '👍', userId: 'u2' },
          { emoji: '🎉', userId: 'u3' },
        ],
        'u9',
      );

      expect(result).toEqual([
        { emoji: '👍', count: 2, userIds: ['u1', 'u2'], reactedByMe: false },
        { emoji: '🎉', count: 1, userIds: ['u3'], reactedByMe: false },
      ]);
    });

    it('should mark reactedByMe when the viewer is among the reactors', () => {
      const result = serializer.reactions([{ emoji: '👍', userId: 'viewer' }], 'viewer');
      expect(result[0]?.reactedByMe).toBe(true);
    });

    it('should return an empty array for no reactions', () => {
      expect(serializer.reactions([], 'u1')).toEqual([]);
    });
  });

  describe('poll()', () => {
    it('should compute per-option vote counts, votedByMe, and total votes', () => {
      const poll: PollWithOptions = {
        id: 'p1',
        question: 'Lunch?',
        multiple: false,
        closedAt: null,
        options: [
          {
            id: 'o1',
            text: 'Pizza',
            order: 0,
            votes: [{ userId: 'viewer' }, { userId: 'u2' }],
          },
          { id: 'o2', text: 'Sushi', order: 1, votes: [{ userId: 'u3' }] },
        ],
      } as unknown as PollWithOptions;

      const dto = serializer.poll(poll, 'viewer');

      expect(dto.totalVotes).toBe(3);
      expect(dto.options[0]).toEqual({
        id: 'o1',
        text: 'Pizza',
        order: 0,
        voteCount: 2,
        votedByMe: true,
      });
      expect(dto.options[1]?.votedByMe).toBe(false);
    });

    it('should serialize closedAt to ISO when present', () => {
      const poll: PollWithOptions = {
        id: 'p1',
        question: 'Q',
        multiple: true,
        closedAt: new Date('2026-02-02T00:00:00.000Z'),
        options: [],
      } as unknown as PollWithOptions;

      expect(serializer.poll(poll, 'viewer').closedAt).toBe('2026-02-02T00:00:00.000Z');
    });
  });

  describe('message()', () => {
    it('should map a plain text message with sender and timestamps', () => {
      const dto = serializer.message(baseMessage(), 'viewer');

      expect(dto).toMatchObject({
        id: 'm1',
        conversationId: 'c1',
        type: 'TEXT',
        priority: 'NORMAL',
        content: 'hello world',
        sender: { id: 'u1', name: 'Alice', avatar: 'https://cdn/a/alice.png' },
        parentId: null,
        parent: null,
        replyCount: 0,
        attachments: [],
        reactions: [],
        poll: null,
        mentionedUserIds: [],
        mentionsEveryone: false,
        pinned: false,
        saved: false,
        editedAt: null,
        deletedAt: null,
        sentAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('should blank content and drop attachments for a deleted message', () => {
      const dto = serializer.message(
        baseMessage({
          content: 'secret',
          deletedAt: new Date('2026-01-02T00:00:00.000Z'),
          attachments: [{ id: 'a1' }] as never,
        }),
        'viewer',
      );

      expect(dto.content).toBe('');
      expect(dto.attachments).toEqual([]);
      expect(dto.deletedAt).toBe('2026-01-02T00:00:00.000Z');
      expect(uploads.toDto).not.toHaveBeenCalled();
    });

    it('should serialize attachments via the uploads service when not deleted', () => {
      const dto = serializer.message(
        baseMessage({ attachments: [{ id: 'a1' }, { id: 'a2' }] as never }),
        'viewer',
      );

      expect(uploads.toDto).toHaveBeenCalledTimes(2);
      expect(dto.attachments).toEqual([
        { id: 'a1', url: 'url/a1' },
        { id: 'a2', url: 'url/a2' },
      ]);
    });

    it('should only include USER mentions with a non-null id and flag everyone', () => {
      const dto = serializer.message(
        baseMessage({
          mentions: [
            { kind: MentionKind.USER, mentionedUserId: 'u1' },
            { kind: MentionKind.USER, mentionedUserId: null },
            { kind: MentionKind.EVERYONE, mentionedUserId: null },
          ] as never,
        }),
        'viewer',
      );

      expect(dto.mentionedUserIds).toEqual(['u1']);
      expect(dto.mentionsEveryone).toBe(true);
    });

    it('should map a parent reference and blank a deleted parent content', () => {
      const dto = serializer.message(
        baseMessage({
          parentId: 'p1',
          parent: {
            id: 'p1',
            content: 'parent text',
            sender: { id: 'u2', name: 'Bob', avatarKey: null },
            deletedAt: null,
          } as never,
        }),
        'viewer',
      );

      expect(dto.parent).toEqual({
        id: 'p1',
        content: 'parent text',
        sender: { id: 'u2', name: 'Bob', avatar: null },
        deletedAt: null,
      });
    });

    it('should blank a deleted parent and expose its deletedAt', () => {
      const dto = serializer.message(
        baseMessage({
          parentId: 'p1',
          parent: {
            id: 'p1',
            content: 'gone',
            sender: null,
            deletedAt: new Date('2026-01-03T00:00:00.000Z'),
          } as never,
        }),
        'viewer',
      );

      expect(dto.parent?.content).toBe('');
      expect(dto.parent?.deletedAt).toBe('2026-01-03T00:00:00.000Z');
      expect(dto.parent?.sender).toBeNull();
    });

    it('should reflect pinned and saved flags from the provided sets', () => {
      const dto = serializer.message(baseMessage(), 'viewer', {
        pinnedMessageIds: new Set(['m1']),
        savedMessageIds: new Set(['m1']),
      });

      expect(dto.pinned).toBe(true);
      expect(dto.saved).toBe(true);
    });

    it('should serialize editedAt when set', () => {
      const dto = serializer.message(
        baseMessage({ editedAt: new Date('2026-01-04T00:00:00.000Z') }),
        'viewer',
      );
      expect(dto.editedAt).toBe('2026-01-04T00:00:00.000Z');
    });

    it('should serialize a poll relative to the viewer', () => {
      const dto = serializer.message(
        baseMessage({
          poll: {
            id: 'p1',
            question: 'Q',
            multiple: false,
            closedAt: null,
            options: [{ id: 'o1', text: 'A', order: 0, votes: [{ userId: 'viewer' }] }],
          } as never,
        }),
        'viewer',
      );

      expect(dto.poll?.id).toBe('p1');
      expect(dto.poll?.options[0]?.votedByMe).toBe(true);
    });
  });

  describe('conversation()', () => {
    function baseConversation(
      overrides: Partial<ConversationWithMembers> = {},
    ): ConversationWithMembers {
      return {
        id: 'c1',
        type: 'DIRECT',
        title: 'Title',
        description: 'Desc',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        members: [
          {
            userId: 'viewer',
            role: 'ADMIN',
            lastReadAt: new Date('2026-01-05T00:00:00.000Z'),
            muted: true,
            pinned: true,
            hidden: false,
            user: { name: 'Alice', avatarKey: 'a/alice.png', chatDisabled: false },
          },
          {
            userId: 'u2',
            role: 'MEMBER',
            lastReadAt: null,
            muted: false,
            pinned: false,
            hidden: false,
            user: { name: 'Bob', avatarKey: null, chatDisabled: true },
          },
        ],
        ...overrides,
      } as unknown as ConversationWithMembers;
    }

    it('should map members, merging presence snapshots and viewer-relative flags', () => {
      const presence = new Map<string, PresenceSnapshot>([
        [
          'viewer',
          {
            online: true,
            status: 'BUSY',
            customText: 'heads down',
            lastSeen: '2026-01-06T00:00:00.000Z',
          } as unknown as PresenceSnapshot,
        ],
      ]);

      const dto = serializer.conversation(baseConversation(), {
        viewerId: 'viewer',
        presence,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 3,
      });

      expect(dto).toMatchObject({
        id: 'c1',
        type: 'DIRECT',
        title: 'Title',
        description: 'Desc',
        unreadCount: 3,
        muted: true,
        pinned: true,
        hidden: false,
        youAreAdmin: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        lastMessage: null,
        lastMessageAt: null,
      });

      expect(dto.members[0]).toEqual({
        userId: 'viewer',
        name: 'Alice',
        avatar: 'https://cdn/a/alice.png',
        role: 'ADMIN',
        lastReadAt: '2026-01-05T00:00:00.000Z',
        lastDeliveredAt: null,
        online: true,
        status: 'BUSY',
        customText: 'heads down',
        lastSeen: '2026-01-06T00:00:00.000Z',
        chatDisabled: false,
      });
    });

    it('should default presence fields when no snapshot exists', () => {
      const dto = serializer.conversation(baseConversation(), {
        viewerId: 'viewer',
        presence: new Map(),
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
      });

      const bob = dto.members.find((m) => m.userId === 'u2');
      expect(bob).toMatchObject({
        online: false,
        status: null,
        customText: null,
        lastSeen: null,
        chatDisabled: true,
        lastReadAt: null,
      });
    });

    it('should serialize the last message and lastMessageAt when present', () => {
      const dto = serializer.conversation(baseConversation(), {
        viewerId: 'viewer',
        presence: new Map(),
        lastMessage: baseMessage(),
        lastMessageAt: new Date('2026-01-07T00:00:00.000Z'),
        unreadCount: 0,
      });

      expect(dto.lastMessage?.id).toBe('m1');
      expect(dto.lastMessageAt).toBe('2026-01-07T00:00:00.000Z');
    });

    it('should report youAreAdmin false and default flags when the viewer is not a member', () => {
      const dto = serializer.conversation(baseConversation(), {
        viewerId: 'stranger',
        presence: new Map(),
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
      });

      expect(dto.youAreAdmin).toBe(false);
      expect(dto.muted).toBe(false);
      expect(dto.pinned).toBe(false);
      expect(dto.hidden).toBe(false);
    });
  });
});
