import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConversationMemberRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServerEvent } from '@open-meet/types';

import { GroupsService } from '@/modules/client/messaging/services/groups.service';
import { type GroupsRepository } from '@/modules/client/messaging/repositories/groups.repository';
import { type ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/services/chat-permissions.service';
import { type MessagingSerializer } from '@/modules/client/messaging/messaging.serializer';
import { type PresenceService } from '@/modules/client/messaging/services/presence.service';
import {
  type ChatBus,
  conversationRoom,
  userRoom,
} from '@/modules/client/messaging/services/chat-bus.service';

function member(userId: string, role: ConversationMemberRole = ConversationMemberRole.MEMBER) {
  return {
    userId,
    role,
    clearedAt: null,
    lastReadAt: null,
    manualUnread: false,
  };
}

describe('GroupsService', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let permissions: Record<string, ReturnType<typeof vi.fn>>;
  let conversations: Record<string, ReturnType<typeof vi.fn>>;
  let serializer: { conversation: ReturnType<typeof vi.fn> };
  let presence: { snapshot: ReturnType<typeof vi.fn> };
  let bus: { emit: ReturnType<typeof vi.fn> };
  let service: GroupsService;

  const groupConv = {
    id: 'c1',
    createdAt: '2026-01-01',
    members: [member('creator', ConversationMemberRole.ADMIN), member('u2')],
  };

  beforeEach(() => {
    repo = {
      pickInvitableUsers: vi.fn(async (ids: string[]) => ids),
      create: vi.fn(),
      update: vi.fn(),
      memberUserIds: vi.fn().mockResolvedValue(['creator', 'u2']),
      addMembers: vi.fn(),
      removeMember: vi.fn(),
      setMemberRole: vi.fn(),
      delete: vi.fn(),
      findWithMembers: vi.fn().mockResolvedValue(groupConv),
    };
    permissions = {
      assertCanCreateGroup: vi.fn(),
      filterEligibleTargets: vi.fn(async (_actor: string, ids: string[]) => ids),
      assertGroupAdmin: vi.fn(),
      assertGroupAdminOrSelf: vi.fn(),
      groupAdminCount: vi.fn(),
      assertConversationMember: vi.fn(),
    };
    conversations = {
      lastVisibleMessage: vi.fn().mockResolvedValue(null),
      unreadCount: vi.fn().mockResolvedValue(0),
    };
    serializer = {
      conversation: vi.fn((conv, opts) => ({ id: conv.id, unreadCount: opts.unreadCount })),
    };
    presence = { snapshot: vi.fn().mockResolvedValue(new Map()) };
    bus = { emit: vi.fn() };
    service = new GroupsService(
      repo as unknown as GroupsRepository,
      permissions as unknown as ChatPermissionsService,
      conversations as unknown as ConversationsRepository,
      serializer as unknown as MessagingSerializer,
      presence as unknown as PresenceService,
      bus as unknown as ChatBus,
    );
  });

  describe('create()', () => {
    it('should gate on permission, filter members, persist, and notify every member', async () => {
      repo.create.mockResolvedValue({
        id: 'c1',
        members: [{ userId: 'creator' }, { userId: 'u2' }],
      });

      const result = await service.create('creator', {
        title: '  Team  ',
        description: '  hi  ',
        memberIds: ['u2', 'creator', '', 'u2'],
      });

      expect(permissions.assertCanCreateGroup).toHaveBeenCalledWith('creator');
      expect(repo.pickInvitableUsers).toHaveBeenCalledWith(['u2']);
      expect(repo.create).toHaveBeenCalledWith({
        creatorId: 'creator',
        title: 'Team',
        description: 'hi',
        memberIds: ['u2'],
      });
      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('creator'),
        ChatServerEvent.CONVERSATION_NEW,
        expect.any(Object),
      );
      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('u2'),
        ChatServerEvent.CONVERSATION_NEW,
        expect.any(Object),
      );
      expect(result.id).toBe('c1');
    });

    it('should reject a title that is empty after trimming', async () => {
      await expect(
        service.create('creator', { title: '   ', memberIds: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should reject a title longer than 80 characters', async () => {
      await expect(
        service.create('creator', { title: 'a'.repeat(81), memberIds: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a description longer than 280 characters', async () => {
      await expect(
        service.create('creator', { title: 'ok', description: 'a'.repeat(281), memberIds: [] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should normalize a blank description to null', async () => {
      repo.create.mockResolvedValue({ id: 'c1', members: [{ userId: 'creator' }] });

      await service.create('creator', { title: 'ok', description: '   ', memberIds: [] });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
    });
  });

  describe('update()', () => {
    it('should require admin, apply changes, and broadcast an update', async () => {
      const result = await service.update('c1', 'creator', { title: ' New ', description: ' d ' });

      expect(permissions.assertGroupAdmin).toHaveBeenCalledWith('c1', 'creator');
      expect(repo.update).toHaveBeenCalledWith('c1', { title: 'New', description: 'd' });
      expect(bus.emit).toHaveBeenCalledWith(
        conversationRoom('c1'),
        ChatServerEvent.CONVERSATION_UPDATE,
        expect.any(Object),
      );
      expect(result.id).toBe('c1');
    });

    it('should skip the repository write when no fields are provided', async () => {
      await service.update('c1', 'creator', {});

      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should reject an invalid title', async () => {
      await expect(service.update('c1', 'creator', { title: '' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('addMembers()', () => {
    it('should add only new eligible members and notify them', async () => {
      repo.memberUserIds.mockResolvedValue(['creator', 'u2']);
      repo.pickInvitableUsers.mockResolvedValue(['u3']);
      permissions.filterEligibleTargets.mockResolvedValue(['u3']);

      await service.addMembers('c1', 'creator', ['u2', 'u3', 'u3']);

      expect(repo.pickInvitableUsers).toHaveBeenCalledWith(['u3']);
      expect(repo.addMembers).toHaveBeenCalledWith('c1', ['u3']);
      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('u3'),
        ChatServerEvent.CONVERSATION_NEW,
        expect.any(Object),
      );
    });

    it('should short-circuit without writing when no one is invitable', async () => {
      repo.pickInvitableUsers.mockResolvedValue([]);
      permissions.filterEligibleTargets.mockResolvedValue([]);

      await service.addMembers('c1', 'creator', ['u2']);

      expect(repo.addMembers).not.toHaveBeenCalled();
    });
  });

  describe('removeMember()', () => {
    it('should remove the member and notify both the target and the group', async () => {
      permissions.assertGroupAdminOrSelf.mockResolvedValue({
        membership: { role: ConversationMemberRole.MEMBER },
      });

      await service.removeMember('c1', 'creator', 'u2');

      expect(repo.removeMember).toHaveBeenCalledWith('c1', 'u2');
      expect(bus.emit).toHaveBeenCalledWith(userRoom('u2'), ChatServerEvent.CONVERSATION_REMOVED, {
        conversationId: 'c1',
      });
    });

    it('should block the last admin from leaving while members remain', async () => {
      permissions.assertGroupAdminOrSelf.mockResolvedValue({
        membership: { role: ConversationMemberRole.ADMIN },
      });
      permissions.groupAdminCount.mockResolvedValue(1);
      repo.memberUserIds.mockResolvedValue(['creator', 'u2']);

      await expect(service.removeMember('c1', 'creator', 'creator')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.removeMember).not.toHaveBeenCalled();
    });

    it('should let the last admin leave when they are the only member', async () => {
      permissions.assertGroupAdminOrSelf.mockResolvedValue({
        membership: { role: ConversationMemberRole.ADMIN },
      });
      permissions.groupAdminCount.mockResolvedValue(1);
      repo.memberUserIds.mockResolvedValue(['creator']);

      await service.removeMember('c1', 'creator', 'creator');

      expect(repo.removeMember).toHaveBeenCalledWith('c1', 'creator');
    });
  });

  describe('updateMemberRole()', () => {
    it('should promote a member to admin and broadcast', async () => {
      await service.updateMemberRole('c1', 'creator', 'u2', ConversationMemberRole.ADMIN);

      expect(repo.setMemberRole).toHaveBeenCalledWith('c1', 'u2', ConversationMemberRole.ADMIN);
    });

    it('should block demoting the only admin', async () => {
      permissions.groupAdminCount.mockResolvedValue(1);
      permissions.assertConversationMember.mockResolvedValue({
        role: ConversationMemberRole.ADMIN,
      });

      await expect(
        service.updateMemberRole('c1', 'creator', 'creator', ConversationMemberRole.MEMBER),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.setMemberRole).not.toHaveBeenCalled();
    });

    it('should allow demotion when another admin exists', async () => {
      permissions.groupAdminCount.mockResolvedValue(2);
      permissions.assertConversationMember.mockResolvedValue({
        role: ConversationMemberRole.ADMIN,
      });

      await service.updateMemberRole('c1', 'creator', 'u2', ConversationMemberRole.MEMBER);

      expect(repo.setMemberRole).toHaveBeenCalledWith('c1', 'u2', ConversationMemberRole.MEMBER);
    });
  });

  describe('delete()', () => {
    it('should delete the group and notify every former member', async () => {
      repo.memberUserIds.mockResolvedValue(['creator', 'u2']);

      await service.delete('c1', 'creator');

      expect(permissions.assertGroupAdmin).toHaveBeenCalledWith('c1', 'creator');
      expect(repo.delete).toHaveBeenCalledWith('c1');
      expect(bus.emit).toHaveBeenCalledWith(
        userRoom('creator'),
        ChatServerEvent.CONVERSATION_REMOVED,
        {
          conversationId: 'c1',
        },
      );
      expect(bus.emit).toHaveBeenCalledWith(userRoom('u2'), ChatServerEvent.CONVERSATION_REMOVED, {
        conversationId: 'c1',
      });
    });
  });

  describe('toDto via broadcastUpdate', () => {
    it('should throw NotFound when the group cannot be loaded', async () => {
      repo.findWithMembers.mockResolvedValue(null);

      await expect(service.update('c1', 'creator', { title: 'New' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
