import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/prisma.service';
import { AdminUsersRepository } from '@/modules/admin/users/users.repository';

const countInclude = { _count: { select: { hostedMeetings: true, meetings: true } } };

describe('AdminUsersRepository', () => {
  let repo: AdminUsersRepository;
  let user: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    user = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: 'u1' }),
      delete: vi.fn().mockResolvedValue({ id: 'u1' }),
    };
    repo = new AdminUsersRepository({ user } as unknown as PrismaService);
  });

  describe('list()', () => {
    it('should use an empty where and include meeting counts when no search is given', async () => {
      await repo.list({ skip: 5, take: 10 });
      expect(user.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 10,
        where: {},
        orderBy: { createdAt: 'desc' },
        include: countInclude,
      });
    });
  });

  describe('count()', () => {
    it('should build a case-insensitive OR on name and email when searching', async () => {
      await repo.count('jane');
      expect(user.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'jane', mode: 'insensitive' } },
            { email: { contains: 'jane', mode: 'insensitive' } },
          ],
        },
      });
    });
  });

  describe('emailTakenByOther()', () => {
    it('should lowercase the email and exclude the current user', async () => {
      await repo.emailTakenByOther('Foo@Bar.com', 'u1');
      expect(user.findFirst).toHaveBeenCalledWith({
        where: { email: 'foo@bar.com', NOT: { id: 'u1' } },
      });
    });
  });

  describe('findById()', () => {
    it('should include meeting counts', async () => {
      await repo.findById('u1');
      expect(user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, include: countInclude });
    });
  });

  describe('delete()', () => {
    it('should remove the user by id', async () => {
      await repo.delete('u1');
      expect(user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });
  });
});
