import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { TeammatesRepository } from '@/modules/client/messaging/repositories/teammates.repository';

describe('TeammatesRepository', () => {
  let repo: TeammatesRepository;
  let user: { findMany: ReturnType<typeof vi.fn> };
  let conversation: { findMany: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    user = { findMany: vi.fn().mockResolvedValue([]) };
    conversation = { findMany: vi.fn().mockResolvedValue([]) };
    repo = new TeammatesRepository({ user, conversation } as unknown as PrismaService);
  });

  describe('search()', () => {
    it('should exclude the viewer and apply no name filter when query is blank', async () => {
      await repo.search('u1', '   ');
      expect(user.findMany).toHaveBeenCalledWith({
        where: { id: { not: 'u1' } },
        select: {
          id: true,
          name: true,
          email: true,
          avatarKey: true,
          chatDisabled: true,
          settings: { select: { allowDirectMessages: true } },
        },
        orderBy: { name: 'asc' },
        take: 50,
      });
    });

    it('should apply a case-insensitive OR filter on name and email when query is given', async () => {
      await repo.search('u1', 'bob');
      const arg = user.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({
        id: { not: 'u1' },
        OR: [
          { name: { contains: 'bob', mode: 'insensitive' } },
          { email: { contains: 'bob', mode: 'insensitive' } },
        ],
      });
    });

    it('should map rows and default allowDirectMessages to true when settings are missing', async () => {
      user.findMany.mockResolvedValue([
        {
          id: 'a',
          name: 'A',
          email: 'a@x',
          avatarKey: null,
          chatDisabled: false,
          settings: { allowDirectMessages: false },
        },
        {
          id: 'b',
          name: 'B',
          email: 'b@x',
          avatarKey: 'k',
          chatDisabled: true,
          settings: null,
        },
      ]);
      const result = await repo.search('u1');
      expect(result).toEqual([
        {
          id: 'a',
          name: 'A',
          email: 'a@x',
          avatarKey: null,
          chatDisabled: false,
          allowDirectMessages: false,
        },
        {
          id: 'b',
          name: 'B',
          email: 'b@x',
          avatarKey: 'k',
          chatDisabled: true,
          allowDirectMessages: true,
        },
      ]);
    });
  });

  describe('directConversationIds()', () => {
    it('should return an empty map without querying when no other ids are given', async () => {
      const result = await repo.directConversationIds('u1', []);
      expect(result.size).toBe(0);
      expect(conversation.findMany).not.toHaveBeenCalled();
    });

    it('should query by sorted direct keys and map each peer to its conversation id', async () => {
      conversation.findMany.mockResolvedValue([
        { id: 'c1', directKey: ['u1', 'u2'].sort().join(':') },
        { id: 'c2', directKey: ['u1', 'u3'].sort().join(':') },
      ]);
      const result = await repo.directConversationIds('u1', ['u2', 'u3']);
      expect(conversation.findMany).toHaveBeenCalledWith({
        where: { directKey: { in: ['u1:u2', 'u1:u3'] } },
        select: { id: true, directKey: true },
      });
      expect(result.get('u2')).toBe('c1');
      expect(result.get('u3')).toBe('c2');
    });

    it('should skip rows without a directKey', async () => {
      conversation.findMany.mockResolvedValue([
        { id: 'c1', directKey: null },
        { id: 'c2', directKey: 'u1:u2' },
      ]);
      const result = await repo.directConversationIds('u1', ['u2']);
      expect(result.size).toBe(1);
      expect(result.get('u2')).toBe('c2');
    });
  });
});
