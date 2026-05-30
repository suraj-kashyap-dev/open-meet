import type { Prisma, User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/prisma.service';
import { AuthRepository } from '@/modules/client/auth/auth.repository';

describe('AuthRepository', () => {
  let repo: AuthRepository;
  let user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  const sentinel = { id: 'u1' } as User;

  beforeEach(() => {
    user = {
      findUnique: vi.fn().mockResolvedValue(sentinel),
      create: vi.fn().mockResolvedValue(sentinel),
      update: vi.fn().mockResolvedValue(sentinel),
    };
    repo = new AuthRepository({ user } as unknown as PrismaService);
  });

  describe('findByEmail()', () => {
    it('should lowercase the email before querying', async () => {
      await expect(repo.findByEmail('Foo@BAR.com')).resolves.toBe(sentinel);
      expect(user.findUnique).toHaveBeenCalledWith({ where: { email: 'foo@bar.com' } });
    });
  });

  describe('findById()', () => {
    it('should query by id', async () => {
      await repo.findById('u1');
      expect(user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });
  });

  describe('findByGoogleId()', () => {
    it('should query by googleId', async () => {
      await repo.findByGoogleId('g1');
      expect(user.findUnique).toHaveBeenCalledWith({ where: { googleId: 'g1' } });
    });
  });

  describe('create()', () => {
    it('should lowercase the email', async () => {
      await repo.create({ name: 'A', email: 'A@B.com', passwordHash: 'h' });
      expect(user.create).toHaveBeenCalledWith({
        data: {
          name: 'A',
          email: 'a@b.com',
          passwordHash: 'h',
        },
      });
    });
  });

  describe('createGoogleUser()', () => {
    it('should lowercase the email', async () => {
      await repo.createGoogleUser({ name: 'A', email: 'A@B.com', googleId: 'g1', avatarUrl: null });
      expect(user.create).toHaveBeenCalledWith({
        data: {
          name: 'A',
          email: 'a@b.com',
          googleId: 'g1',
          avatarUrl: null,
        },
      });
    });
  });

  describe('update()', () => {
    it('should forward the id and data unchanged', async () => {
      const data = { name: 'B' } as Prisma.UserUpdateInput;
      await repo.update('u1', data);
      expect(user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data });
    });
  });
});
