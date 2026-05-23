import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminRepository } from '@/modules/admin/admin.repository';
import { AdminAccountsService } from '@/modules/admin/accounts/accounts.service';

vi.mock('argon2', () => ({ hash: vi.fn().mockResolvedValue('HASH'), argon2id: 2 }));

describe('AdminAccountsService', () => {
  let service: AdminAccountsService;
  let admins: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    admins = {
      list: vi.fn().mockResolvedValue([]),
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      countByRole: vi.fn().mockResolvedValue(2),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'new',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastLoginAt: null,
          ...data,
        }),
      ),
      delete: vi.fn().mockResolvedValue({ id: 'target' }),
    };
    service = new AdminAccountsService(admins as unknown as AdminRepository);
  });

  describe('invite()', () => {
    it('should reject a blank name', async () => {
      await expect(
        service.invite({ email: 'a@x.com', name: '   ', password: 'pw' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a duplicate email', async () => {
      admins.findByEmail.mockResolvedValueOnce({ id: 'dup' });
      await expect(
        service.invite({ email: 'a@x.com', name: 'A', password: 'pw' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should normalize email/name, hash the password, and default the role to ADMIN', async () => {
      await service.invite({ email: '  A@X.COM ', name: '  Jo ', password: 'pw' } as never);
      expect(admins.create).toHaveBeenCalledWith({
        email: 'a@x.com',
        name: 'Jo',
        passwordHash: 'HASH',
        role: AdminRole.ADMIN,
      });
    });
  });

  describe('delete()', () => {
    it('should refuse self-deletion', async () => {
      await expect(service.delete('a1', 'a1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw when the target admin is missing', async () => {
      admins.findById.mockResolvedValueOnce(null);
      await expect(service.delete('a1', 'a2')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should refuse to remove the last remaining superadmin', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a2', role: AdminRole.SUPERADMIN });
      admins.countByRole.mockResolvedValueOnce(1);
      await expect(service.delete('a1', 'a2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should remove a regular admin', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a2', role: AdminRole.ADMIN });
      await expect(service.delete('a1', 'a2')).resolves.toEqual({ deleted: true });
      expect(admins.delete).toHaveBeenCalledWith('a2');
    });
  });
});
