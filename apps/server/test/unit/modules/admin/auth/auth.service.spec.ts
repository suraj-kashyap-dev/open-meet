import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import type { AdminRepository } from '@/modules/admin/repositories/admin.repository';
import { AdminAuthService } from '@/modules/admin/auth/services/auth.service';
import type { AdminRoleRepository } from '@/modules/admin/rbac/repositories/admin-role.repository';
import type { StorageService } from '@/storage/services/storage.service';

vi.mock('argon2', () => ({
  verify: vi.fn(),
  hash: vi.fn().mockResolvedValue('NEW_HASH'),
  argon2id: 2,
}));

const adminRow = {
  id: 'a1',
  email: 'admin@x.com',
  name: 'Admin',
  passwordHash: 'hash',
  avatarKey: null,
  roleRecordId: 'role_sys_admin',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastLoginAt: null,
};

const adminRole = {
  id: 'role_sys_admin',
  name: 'Administrator',
  description: null,
  permissionType: 'ALL' as const,
  permissions: [],
  isSystem: true,
  cacheRev: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let admins: Record<string, ReturnType<typeof vi.fn>>;
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let storage: { publicUrl: ReturnType<typeof vi.fn> };
  let roles: { findById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.mocked(argon2.verify).mockReset().mockResolvedValue(true);

    vi.mocked(argon2.hash).mockClear().mockResolvedValue('NEW_HASH');

    admins = {
      findByEmail: vi.fn().mockResolvedValue(adminRow),
      findById: vi.fn().mockResolvedValue(adminRow),
      touchLastLogin: vi.fn().mockResolvedValue(adminRow),
      update: vi
        .fn()
        .mockImplementation((id, data) => Promise.resolve({ ...adminRow, id, ...data })),
    };

    jwt = { signAsync: vi.fn().mockResolvedValue('signed.jwt') };

    storage = { publicUrl: vi.fn((key: string) => `https://cdn.example/${key}`) };

    roles = { findById: vi.fn().mockResolvedValue(adminRole) };
    const config = {
      getOrThrow: (k: string) =>
        ({ ADMIN_JWT_ACCESS_EXPIRY: '2h', ADMIN_JWT_ACCESS_SECRET: 'secret' })[k],
    } as unknown as ConfigService<ApiEnv, true>;

    service = new AdminAuthService(
      admins as unknown as AdminRepository,
      jwt as unknown as JwtService,
      config,
      storage as unknown as StorageService,
      roles as unknown as AdminRoleRepository,
    );
  });

  describe('login()', () => {
    it('should reject an unknown email', async () => {
      admins.findByEmail.mockResolvedValueOnce(null);

      await expect(service.login({ email: 'x', password: 'p' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should reject a wrong password', async () => {
      vi.mocked(argon2.verify).mockResolvedValueOnce(false);

      await expect(service.login({ email: 'x', password: 'p' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should stamp last login, sign a token, and return the parsed TTL on success', async () => {
      const { admin, tokens } = await service.login({ email: 'admin@x.com', password: 'p' });

      expect(admins.touchLastLogin).toHaveBeenCalledWith('a1');

      expect(jwt.signAsync).toHaveBeenCalledWith(
        { sub: 'a1', email: 'admin@x.com', roleId: 'role_sys_admin' },
        { secret: 'secret', expiresIn: 7200 },
      );

      expect(tokens).toEqual({ accessToken: 'signed.jwt', accessTtlMs: 7_200_000 });

      expect(admin.id).toBe('a1');

      expect(admin.role?.id).toBe('role_sys_admin');
    });
  });

  describe('getAdminDtoById()', () => {
    it('should throw when the admin no longer exists', async () => {
      admins.findById.mockResolvedValueOnce(null);

      await expect(service.getAdminDtoById('a1')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should resolve the avatar key to a public URL', async () => {
      admins.findById.mockResolvedValueOnce({ ...adminRow, avatarKey: 'avatars/admins/a1/x.png' });
      const dto = await service.getAdminDtoById('a1');

      expect(dto.avatar).toBe('https://cdn.example/avatars/admins/a1/x.png');
    });

    it('should return a null avatar when no key is set', async () => {
      const dto = await service.getAdminDtoById('a1');

      expect(dto.avatar).toBeNull();
    });
  });

  describe('updateProfile()', () => {
    it('should trim and persist the new name', async () => {
      const dto = await service.updateProfile('a1', { name: '  New Name  ' });

      expect(admins.update).toHaveBeenCalledWith('a1', { name: 'New Name' });

      expect(dto.name).toBe('New Name');
    });

    it('should reject a blank name', async () => {
      await expect(service.updateProfile('a1', { name: '   ' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should not hit the repository when there is nothing to change', async () => {
      await service.updateProfile('a1', {});

      expect(admins.update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword()', () => {
    it('should reject when the current password is wrong', async () => {
      vi.mocked(argon2.verify).mockResolvedValueOnce(false);

      await expect(
        service.changePassword('a1', { currentPassword: 'bad', newPassword: 'password1' }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(admins.update).not.toHaveBeenCalled();
    });

    it('should hash and persist the new password when the current one matches', async () => {
      await service.changePassword('a1', { currentPassword: 'hash', newPassword: 'password1' });

      expect(argon2.hash).toHaveBeenCalledWith('password1', { type: argon2.argon2id });

      expect(admins.update).toHaveBeenCalledWith('a1', { passwordHash: 'NEW_HASH' });
    });

    it('should throw when the admin no longer exists', async () => {
      admins.findById.mockResolvedValueOnce(null);

      await expect(
        service.changePassword('a1', { currentPassword: 'hash', newPassword: 'password1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
