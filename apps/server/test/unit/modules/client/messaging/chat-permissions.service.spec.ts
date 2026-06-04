import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatPermissionsService } from '@/modules/client/messaging/chat-permissions.service';
import { type ChatPermissionsRepository } from '@/modules/client/messaging/chat-permissions.repository';

describe('ChatPermissionsService', () => {
  let repo: {
    findUserBasics: ReturnType<typeof vi.fn>;
    getMembership: ReturnType<typeof vi.fn>;
    getDirectPeer: ReturnType<typeof vi.fn>;
    getConversationMeta: ReturnType<typeof vi.fn>;
  };
  let service: ChatPermissionsService;

  const enabled = (id: string) => ({
    id,
    name: id,
    chatDisabled: false,
    allowDirectMessages: true,
  });

  beforeEach(() => {
    repo = {
      findUserBasics: vi.fn().mockResolvedValue(enabled('u2')),
      getMembership: vi.fn(),
      getDirectPeer: vi.fn().mockResolvedValue(null),
      getConversationMeta: vi.fn(),
    };
    service = new ChatPermissionsService(repo as unknown as ChatPermissionsRepository);
  });

  describe('assertCanDirectMessage()', () => {
    it('should reject messaging yourself', async () => {
      await expect(service.assertCanDirectMessage('u1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should reject when the target does not exist', async () => {
      repo.findUserBasics.mockResolvedValue(null);
      await expect(service.assertCanDirectMessage('u1', 'u2')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should allow messaging any existing user (chat is open)', async () => {
      repo.findUserBasics.mockResolvedValue(enabled('u2'));
      await expect(service.assertCanDirectMessage('u1', 'u2')).resolves.toBeUndefined();
    });
  });

  describe('canDirectMessage()', () => {
    it('should be false for self', async () => {
      await expect(service.canDirectMessage('u1', 'u1')).resolves.toBe(false);
    });

    it('should be true for any other user (chat is open)', async () => {
      await expect(service.canDirectMessage('u1', 'u2')).resolves.toBe(true);
    });
  });

  describe('assertDirectConversationAllowed()', () => {
    it('should be a no-op (chat is open)', async () => {
      await expect(service.assertDirectConversationAllowed('c1', 'u1')).resolves.toBeUndefined();
    });
  });

  describe('filterEligibleTargets()', () => {
    it('should keep every candidate except the actor (chat is open)', async () => {
      await expect(service.filterEligibleTargets('u1', ['u2', 'u3'])).resolves.toEqual([
        'u2',
        'u3',
      ]);
    });

    it('should drop the actor itself', async () => {
      await expect(service.filterEligibleTargets('u1', ['u1', 'u2'])).resolves.toEqual(['u2']);
    });
  });

  describe('assertConversationMember()', () => {
    it('should throw when the user is not a member', async () => {
      repo.getMembership.mockResolvedValue(null);
      await expect(service.assertConversationMember('c1', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should return the membership when present', async () => {
      const membership = { id: 'm1', conversationId: 'c1', userId: 'u1' };
      repo.getMembership.mockResolvedValue(membership);
      await expect(service.assertConversationMember('c1', 'u1')).resolves.toBe(membership);
    });
  });

  describe('assertCanPost()', () => {
    it('should reject a non-member', async () => {
      repo.getMembership.mockResolvedValue(null);
      await expect(service.assertCanPost('c1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should allow any member to post (chat is open)', async () => {
      const membership = { id: 'm1', conversationId: 'c1', userId: 'u1' };
      repo.getMembership.mockResolvedValue(membership);
      await expect(service.assertCanPost('c1', 'u1')).resolves.toBe(membership);
    });
  });

  describe('assertCanCreateGroup()', () => {
    it('should allow any user to create a group', async () => {
      await expect(service.assertCanCreateGroup('u1')).resolves.toBeUndefined();
    });
  });
});
