import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { UserInviteRepository } from '@/modules/client/auth/repositories/user-invite.repository';

describe('UserInviteRepository (client auth)', () => {
  let repo: UserInviteRepository;
  let userInvite: Record<string, ReturnType<typeof vi.fn>>;

  const sentinel = { id: 'inv1' };

  beforeEach(() => {
    userInvite = {
      findUnique: vi.fn().mockResolvedValue(sentinel),
      delete: vi.fn().mockResolvedValue(sentinel),
    };

    repo = new UserInviteRepository({ userInvite } as unknown as PrismaService);
  });

  describe('findByTokenHash()', () => {
    it('should query by token hash', async () => {
      await expect(repo.findByTokenHash('hash')).resolves.toBe(sentinel);

      expect(userInvite.findUnique).toHaveBeenCalledWith({ where: { tokenHash: 'hash' } });
    });
  });

  describe('delete()', () => {
    it('should delete by id and resolve void', async () => {
      await expect(repo.delete('inv1')).resolves.toBeUndefined();

      expect(userInvite.delete).toHaveBeenCalledWith({ where: { id: 'inv1' } });
    });
  });
});
