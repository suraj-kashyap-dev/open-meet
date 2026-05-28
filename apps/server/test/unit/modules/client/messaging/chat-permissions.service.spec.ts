import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatPermissionsService } from '@/modules/client/messaging/chat-permissions.service';
import { type ChatPermissionsRepository } from '@/modules/client/messaging/chat-permissions.repository';

describe('ChatPermissionsService', () => {
  let repo: {
    findUserBasics: ReturnType<typeof vi.fn>;
    shareTeam: ReturnType<typeof vi.fn>;
    getMembership: ReturnType<typeof vi.fn>;
    getDirectPeer: ReturnType<typeof vi.fn>;
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
      findUserBasics: vi.fn(),
      shareTeam: vi.fn(),
      getMembership: vi.fn(),
      getDirectPeer: vi.fn(),
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
      repo.findUserBasics.mockResolvedValueOnce(enabled('u1')).mockResolvedValueOnce(null);
      await expect(service.assertCanDirectMessage('u1', 'u2')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should reject when the target is chat-disabled', async () => {
      repo.findUserBasics
        .mockResolvedValueOnce(enabled('u1'))
        .mockResolvedValueOnce({
          id: 'u2',
          name: 'u2',
          chatDisabled: true,
          allowDirectMessages: true,
        });
      await expect(service.assertCanDirectMessage('u1', 'u2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should reject when the actor is chat-disabled', async () => {
      repo.findUserBasics
        .mockResolvedValueOnce({
          id: 'u1',
          name: 'u1',
          chatDisabled: true,
          allowDirectMessages: true,
        })
        .mockResolvedValueOnce(enabled('u2'));
      await expect(service.assertCanDirectMessage('u1', 'u2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should reject when the target blocks direct messages', async () => {
      repo.findUserBasics
        .mockResolvedValueOnce(enabled('u1'))
        .mockResolvedValueOnce({
          id: 'u2',
          name: 'u2',
          chatDisabled: false,
          allowDirectMessages: false,
        });
      await expect(service.assertCanDirectMessage('u1', 'u2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should reject when the two users share no team', async () => {
      repo.findUserBasics.mockResolvedValueOnce(enabled('u1')).mockResolvedValueOnce(enabled('u2'));
      repo.shareTeam.mockResolvedValue(false);
      await expect(service.assertCanDirectMessage('u1', 'u2')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should resolve when both are enabled and share a team', async () => {
      repo.findUserBasics.mockResolvedValueOnce(enabled('u1')).mockResolvedValueOnce(enabled('u2'));
      repo.shareTeam.mockResolvedValue(true);
      await expect(service.assertCanDirectMessage('u1', 'u2')).resolves.toBeUndefined();
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
    it('should reject a chat-disabled member', async () => {
      repo.getMembership.mockResolvedValue({ id: 'm1', conversationId: 'c1', userId: 'u1' });
      repo.findUserBasics.mockResolvedValue({
        id: 'u1',
        name: 'u1',
        chatDisabled: true,
        allowDirectMessages: true,
      });
      repo.getDirectPeer.mockResolvedValue(null);
      await expect(service.assertCanPost('c1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should reject posting in a direct chat when the peer blocks direct messages', async () => {
      repo.getMembership.mockResolvedValue({ id: 'm1', conversationId: 'c1', userId: 'u1' });
      repo.findUserBasics.mockResolvedValue(enabled('u1'));
      repo.getDirectPeer.mockResolvedValue({ userId: 'u2', allowDirectMessages: false });
      await expect(service.assertCanPost('c1', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should allow an enabled member to post', async () => {
      const membership = { id: 'm1', conversationId: 'c1', userId: 'u1' };
      repo.getMembership.mockResolvedValue(membership);
      repo.findUserBasics.mockResolvedValue(enabled('u1'));
      repo.getDirectPeer.mockResolvedValue(null);
      await expect(service.assertCanPost('c1', 'u1')).resolves.toBe(membership);
    });
  });
});
