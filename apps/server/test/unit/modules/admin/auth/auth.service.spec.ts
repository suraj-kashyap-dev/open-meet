import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import type { AdminRepository } from '@/modules/admin/admin.repository';
import { AdminAuthService } from '@/modules/admin/auth/auth.service';

vi.mock('argon2', () => ({ verify: vi.fn(), argon2id: 2 }));

const adminRow = {
  id: 'a1',
  email: 'admin@x.com',
  name: 'Admin',
  role: 'SUPERADMIN',
  passwordHash: 'hash',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastLoginAt: null,
};

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let admins: Record<string, ReturnType<typeof vi.fn>>;
  let jwt: { signAsync: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.mocked(argon2.verify).mockReset().mockResolvedValue(true);
    admins = {
      findByEmail: vi.fn().mockResolvedValue(adminRow),
      findById: vi.fn().mockResolvedValue(adminRow),
      touchLastLogin: vi.fn().mockResolvedValue(adminRow),
    };
    jwt = { signAsync: vi.fn().mockResolvedValue('signed.jwt') };
    const config = {
      getOrThrow: (k: string) =>
        ({ ADMIN_JWT_ACCESS_EXPIRY: '2h', ADMIN_JWT_ACCESS_SECRET: 'secret' })[k],
    } as unknown as ConfigService<ApiEnv, true>;
    service = new AdminAuthService(
      admins as unknown as AdminRepository,
      jwt as unknown as JwtService,
      config,
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
        { sub: 'a1', email: 'admin@x.com', role: 'SUPERADMIN' },
        { secret: 'secret', expiresIn: 7200 },
      );
      expect(tokens).toEqual({ accessToken: 'signed.jwt', accessTtlMs: 7_200_000 });
      expect(admin.id).toBe('a1');
    });
  });

  describe('getAdminDtoById()', () => {
    it('should throw when the admin no longer exists', async () => {
      admins.findById.mockResolvedValueOnce(null);
      await expect(service.getAdminDtoById('a1')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
