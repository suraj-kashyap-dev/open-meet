import { ConversationMemberRole, ConversationType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { GroupsRepository } from '@/modules/client/messaging/repositories/groups.repository';
import {
  conversationInclude,
  conversationListInclude,
} from '@/modules/client/messaging/messaging.includes';

describe('GroupsRepository', () => {
  let repo: GroupsRepository;
  let conversation: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let conversationMember: {
    createMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  let user: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    conversation = {
      create: vi.fn().mockResolvedValue({ id: 'c1' }),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: 'c1' }),
      delete: vi.fn().mockResolvedValue({ id: 'c1' }),
    };

    conversationMember = {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    };

    user = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    };

    repo = new GroupsRepository({
      conversation,
      conversationMember,
      user,
      groupAuditEvent: { create: vi.fn() },
    } as unknown as PrismaService);
  });

  describe('create()', () => {
    it('should create a group with the creator as admin and others as members, dropping the creator from memberIds', async () => {
      await repo.create({
        creatorId: 'creator',
        creatorName: 'Creator',
        title: 'Team',
        description: 'desc',
        memberIds: ['creator', 'm1', 'm2'],
      });

      expect(conversation.create).toHaveBeenCalledWith({
        data: {
          type: ConversationType.GROUP,
          title: 'Team',
          description: 'desc',
          origin: 'USER_CREATED',
          createdByActorType: 'USER',
          createdByUserId: 'creator',
          createdByDisplayName: 'Creator',
          createdVia: 'WEB_CHAT',
          ownerUserId: 'creator',
          members: {
            create: [
              { userId: 'creator', role: 'OWNER' },
              { userId: 'm1', role: ConversationMemberRole.MEMBER },
              { userId: 'm2', role: ConversationMemberRole.MEMBER },
            ],
          },
        },
        include: conversationInclude,
      });
    });
  });

  describe('pickInvitableUsers()', () => {
    it('should return an empty array without querying when no ids are given', async () => {
      const result = await repo.pickInvitableUsers([]);

      expect(result).toEqual([]);

      expect(user.findMany).not.toHaveBeenCalled();
    });

    it('should query chat-enabled users and map to ids', async () => {
      user.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      const result = await repo.pickInvitableUsers(['a', 'b', 'c']);

      expect(user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['a', 'b', 'c'] }, chatDisabled: false },
        select: { id: true },
      });

      expect(result).toEqual(['a', 'b']);
    });
  });

  describe('findById()', () => {
    it('should query the conversation by id', async () => {
      await repo.findById('c1');

      expect(conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 'c1', status: 'ACTIVE' },
      });
    });
  });

  describe('update()', () => {
    it('should update the conversation fields with members include', async () => {
      await repo.update('c1', { title: 'New', description: null });

      expect(conversation.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { title: 'New', description: null },
        include: conversationInclude,
      });
    });
  });

  describe('addMembers()', () => {
    it('should short-circuit when no ids are given', async () => {
      await repo.addMembers('c1', [], null);

      expect(conversationMember.createMany).not.toHaveBeenCalled();
    });

    it('should create member rows skipping duplicates', async () => {
      await repo.addMembers('c1', ['m1', 'm2'], null);

      expect(conversationMember.createMany).toHaveBeenCalledWith({
        data: [
          {
            conversationId: 'c1',
            userId: 'm1',
            role: ConversationMemberRole.MEMBER,
            historyVisibleFrom: null,
          },
          {
            conversationId: 'c1',
            userId: 'm2',
            role: ConversationMemberRole.MEMBER,
            historyVisibleFrom: null,
          },
        ],
        skipDuplicates: true,
      });
    });

    it('should stamp the history cutoff on each created row', async () => {
      const cutoff = new Date('2026-01-01T00:00:00.000Z');

      await repo.addMembers('c1', ['m1'], cutoff);

      expect(conversationMember.createMany).toHaveBeenCalledWith({
        data: [
          {
            conversationId: 'c1',
            userId: 'm1',
            role: ConversationMemberRole.MEMBER,
            historyVisibleFrom: cutoff,
          },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('removeMember()', () => {
    it('should delete the membership row', async () => {
      await repo.removeMember('c1', 'm1');

      expect(conversationMember.deleteMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1', userId: 'm1' },
      });
    });
  });

  describe('setMemberRole()', () => {
    it('should update the membership role', async () => {
      await repo.setMemberRole('c1', 'm1', ConversationMemberRole.ADMIN);

      expect(conversationMember.update).toHaveBeenCalledWith({
        where: { conversationId_userId: { conversationId: 'c1', userId: 'm1' } },
        data: { role: ConversationMemberRole.ADMIN },
      });
    });
  });

  describe('delete()', () => {
    it('should delete the conversation', async () => {
      await repo.delete('c1', 'u1');

      expect(conversation.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: {
          status: 'DELETED',
          deletedAt: expect.any(Date),
          deletedByActorType: 'USER',
          deletedByActorId: 'u1',
        },
      });
    });
  });

  describe('findWithMembers()', () => {
    it('should query the conversation with the list include', async () => {
      await repo.findWithMembers('c1');

      expect(conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 'c1', status: 'ACTIVE' },
        include: conversationListInclude,
      });
    });
  });

  describe('memberUserIds()', () => {
    it('should select and map member userIds', async () => {
      conversationMember.findMany.mockResolvedValue([{ userId: 'a' }, { userId: 'b' }]);
      const ids = await repo.memberUserIds('c1');

      expect(conversationMember.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1' },
        select: { userId: true },
      });

      expect(ids).toEqual(['a', 'b']);
    });
  });
});
