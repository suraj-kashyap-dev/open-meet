import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { ChatPermissionsRepository } from '@/modules/client/messaging/repositories/chat-permissions.repository';

describe('ChatPermissionsRepository', () => {
  let repo: ChatPermissionsRepository;
  let user: { findUnique: ReturnType<typeof vi.fn> };
  let conversationMember: {
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  let conversation: { findUnique: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    user = { findUnique: vi.fn().mockResolvedValue(null) };

    conversationMember = {
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
    };

    conversation = { findUnique: vi.fn().mockResolvedValue(null) };

    repo = new ChatPermissionsRepository({
      user,
      conversationMember,
      conversation,
    } as unknown as PrismaService);
  });

  describe('findUserBasics()', () => {
    it('should return null when the user is missing', async () => {
      const result = await repo.findUserBasics('u1');

      expect(user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        select: {
          id: true,
          name: true,
          chatDisabled: true,
          settings: { select: { allowDirectMessages: true } },
        },
      });

      expect(result).toBeNull();
    });

    it('should flatten settings and default allowDirectMessages to true when absent', async () => {
      user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'A',
        chatDisabled: false,
        settings: null,
      });
      const result = await repo.findUserBasics('u1');

      expect(result).toEqual({
        id: 'u1',
        name: 'A',
        chatDisabled: false,
        allowDirectMessages: true,
      });
    });

    it('should use the settings value when present', async () => {
      user.findUnique.mockResolvedValue({
        id: 'u1',
        name: 'A',
        chatDisabled: true,
        settings: { allowDirectMessages: false },
      });
      const result = await repo.findUserBasics('u1');

      expect(result?.allowDirectMessages).toBe(false);
    });
  });

  describe('shareConversation()', () => {
    it('should count memberships of A in conversations B also belongs to and return whether any exist', async () => {
      conversationMember.count.mockResolvedValue(2);
      const result = await repo.shareConversation('a', 'b');

      expect(conversationMember.count).toHaveBeenCalledWith({
        where: { userId: 'a', conversation: { members: { some: { userId: 'b' } } } },
      });

      expect(result).toBe(true);
    });

    it('should return false when no shared conversation exists', async () => {
      conversationMember.count.mockResolvedValue(0);

      expect(await repo.shareConversation('a', 'b')).toBe(false);
    });
  });

  describe('haveSharedSurface()', () => {
    it('should short-circuit to true when viewer equals target without querying', async () => {
      const result = await repo.haveSharedSurface('u1', 'u1');

      expect(result).toBe(true);

      expect(conversationMember.count).not.toHaveBeenCalled();
    });

    it('should defer to shareConversation for distinct users', async () => {
      conversationMember.count.mockResolvedValue(1);
      const result = await repo.haveSharedSurface('a', 'b');

      expect(conversationMember.count).toHaveBeenCalled();

      expect(result).toBe(true);
    });
  });

  describe('getMembership()', () => {
    it('should query the membership by composite key', async () => {
      await repo.getMembership('c1', 'u1');

      expect(conversationMember.findUnique).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'u1' } },
      });
    });
  });

  describe('getDirectPeer()', () => {
    it('should query the conversation with the other member and settings', async () => {
      await repo.getDirectPeer('c1', 'u1');

      expect(conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        select: {
          type: true,
          members: {
            where: { userId: { not: 'u1' } },
            take: 1,
            select: {
              user: {
                select: {
                  id: true,
                  settings: { select: { allowDirectMessages: true } },
                },
              },
            },
          },
        },
      });
    });

    it('should return null when the conversation is missing', async () => {
      conversation.findUnique.mockResolvedValue(null);

      expect(await repo.getDirectPeer('c1', 'u1')).toBeNull();
    });

    it('should return null when the conversation is not direct', async () => {
      conversation.findUnique.mockResolvedValue({ type: 'GROUP', members: [] });

      expect(await repo.getDirectPeer('c1', 'u1')).toBeNull();
    });

    it('should return null when no peer member exists', async () => {
      conversation.findUnique.mockResolvedValue({ type: 'DIRECT', members: [] });

      expect(await repo.getDirectPeer('c1', 'u1')).toBeNull();
    });

    it('should map the peer and default allowDirectMessages to true when settings are missing', async () => {
      conversation.findUnique.mockResolvedValue({
        type: 'DIRECT',
        members: [{ user: { id: 'peer', settings: null } }],
      });
      const result = await repo.getDirectPeer('c1', 'u1');

      expect(result).toEqual({ userId: 'peer', allowDirectMessages: true });
    });

    it('should use the peer settings value when present', async () => {
      conversation.findUnique.mockResolvedValue({
        type: 'DIRECT',
        members: [{ user: { id: 'peer', settings: { allowDirectMessages: false } } }],
      });
      const result = await repo.getDirectPeer('c1', 'u1');

      expect(result).toEqual({ userId: 'peer', allowDirectMessages: false });
    });
  });

  describe('getUserCanCreateGroups()', () => {
    it('should query the canCreateGroups flag and default to false when the user is missing', async () => {
      user.findUnique.mockResolvedValue(null);
      const result = await repo.getUserCanCreateGroups('u1');

      expect(user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        select: { canCreateGroups: true },
      });

      expect(result).toBe(false);
    });

    it('should return the stored flag value', async () => {
      user.findUnique.mockResolvedValue({ canCreateGroups: true });

      expect(await repo.getUserCanCreateGroups('u1')).toBe(true);
    });
  });

  describe('getConversationMeta()', () => {
    it('should return null when the conversation is missing', async () => {
      conversation.findUnique.mockResolvedValue(null);
      const result = await repo.getConversationMeta('c1');

      expect(conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        select: {
          type: true,
          status: true,
          members: {
            where: { role: { in: ['ADMIN', 'OWNER'] } },
            select: { userId: true },
          },
        },
      });

      expect(result).toBeNull();
    });

    it('should return the type and the count of admin members', async () => {
      conversation.findUnique.mockResolvedValue({
        type: 'GROUP',
        status: 'ACTIVE',
        members: [{ userId: 'a' }, { userId: 'b' }],
      });
      const result = await repo.getConversationMeta('c1');

      expect(result).toEqual({ type: 'GROUP', adminCount: 2 });
    });
  });
});
