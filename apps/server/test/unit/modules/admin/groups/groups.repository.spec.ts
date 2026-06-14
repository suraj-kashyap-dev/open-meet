import { ConversationType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { AdminGroupsRepository } from '@/modules/admin/groups/repositories/groups.repository';

const groupDetailInclude = {
  members: {
    include: { user: { select: { id: true, name: true, email: true, avatarKey: true } } },
    orderBy: { joinedAt: 'asc' },
  },
  _count: { select: { members: true } },
};

const groupListInclude = {
  _count: { select: { members: true } },
};

describe('AdminGroupsRepository', () => {
  let repo: AdminGroupsRepository;
  let conversation: Record<string, ReturnType<typeof vi.fn>>;
  let conversationMember: Record<string, ReturnType<typeof vi.fn>>;

  const sentinel = { id: 'g1' };

  beforeEach(() => {
    conversation = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(sentinel),
      create: vi.fn().mockResolvedValue(sentinel),
      update: vi.fn().mockResolvedValue(sentinel),
      delete: vi.fn().mockResolvedValue(sentinel),
    };

    conversationMember = {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    };

    repo = new AdminGroupsRepository({
      conversation,
      conversationMember,
    } as unknown as PrismaService);
  });

  describe('searchWhere() / listWith() / countWith()', () => {
    it('should scope to GROUP conversations and add a title filter when searching', () => {
      expect(repo.searchWhere()).toEqual({ type: ConversationType.GROUP });

      expect(repo.searchWhere('team')).toEqual({
        type: ConversationType.GROUP,
        title: { contains: 'team', mode: 'insensitive' },
      });
    });

    it('should pass the prebuilt where/orderBy through with the list include', async () => {
      const where = { type: ConversationType.GROUP };

      await repo.listWith({ skip: 0, take: 20, where, orderBy: { createdAt: 'desc' } });

      expect(conversation.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        where,
        orderBy: { createdAt: 'desc' },
        include: groupListInclude,
      });

      await repo.countWith(where);

      expect(conversation.count.mock.calls[0][0].where).toBe(where);
    });
  });

  describe('findDetail()', () => {
    it('should scope to a GROUP by id with the detail include', async () => {
      await repo.findDetail('g1');

      expect(conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 'g1', type: ConversationType.GROUP },
        include: groupDetailInclude,
      });
    });
  });

  describe('create()', () => {
    it('should create a GROUP with nested members and the detail include', async () => {
      await expect(repo.create('Team', 'admin1', ['u1', 'u2'])).resolves.toBe(sentinel);

      expect(conversation.create).toHaveBeenCalledWith({
        data: {
          type: ConversationType.GROUP,
          title: 'Team',
          createdByAdminId: 'admin1',
          members: { create: [{ userId: 'u1' }, { userId: 'u2' }] },
        },
        include: groupDetailInclude,
      });
    });

    it('should create with no nested members when the list is empty', async () => {
      await repo.create('Empty', 'admin1', []);

      expect(conversation.create).toHaveBeenCalledWith({
        data: {
          type: ConversationType.GROUP,
          title: 'Empty',
          createdByAdminId: 'admin1',
          members: { create: [] },
        },
        include: groupDetailInclude,
      });
    });
  });

  describe('update()', () => {
    it('should update the title and return the detail include', async () => {
      await repo.update('g1', 'Renamed');

      expect(conversation.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { title: 'Renamed' },
        include: groupDetailInclude,
      });
    });
  });

  describe('addMembers()', () => {
    it('should createMany members skipping duplicates', async () => {
      await repo.addMembers('g1', ['u1', 'u2'], null);

      expect(conversationMember.createMany).toHaveBeenCalledWith({
        data: [
          { conversationId: 'g1', userId: 'u1', historyVisibleFrom: null },
          { conversationId: 'g1', userId: 'u2', historyVisibleFrom: null },
        ],
        skipDuplicates: true,
      });
    });

    it('should stamp the history cutoff on each created row', async () => {
      const cutoff = new Date('2026-01-01T00:00:00.000Z');

      await repo.addMembers('g1', ['u1'], cutoff);

      expect(conversationMember.createMany).toHaveBeenCalledWith({
        data: [{ conversationId: 'g1', userId: 'u1', historyVisibleFrom: cutoff }],
        skipDuplicates: true,
      });
    });
  });

  describe('removeMember()', () => {
    it('should deleteMany the membership by conversation and user', async () => {
      await repo.removeMember('g1', 'u1');

      expect(conversationMember.deleteMany).toHaveBeenCalledWith({
        where: { conversationId: 'g1', userId: 'u1' },
      });
    });
  });

  describe('delete()', () => {
    it('should delete the conversation by id', async () => {
      await repo.delete('g1');

      expect(conversation.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    });
  });
});
