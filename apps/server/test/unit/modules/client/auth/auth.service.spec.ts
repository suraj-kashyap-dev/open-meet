import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import * as argon2 from 'argon2';

import { AuthService } from '@/modules/client/auth/services/auth.service';
import { AuthRepository } from '@/modules/client/auth/repositories/auth.repository';
import { AvatarsService } from '@/modules/client/auth/services/avatars.service';
import { UserInviteRepository } from '@/modules/client/auth/repositories/user-invite.repository';
import { PresenceService } from '@/modules/client/messaging/services/presence.service';
import { RedisService } from '@/integrations/redis/services/redis.service';

function makeUser(overrides: Partial<{ id: string; email: string; name: string }> = {}) {
  return {
    id: 'u1',
    name: 'Ada',
    email: 'ada@example.com',
    passwordHash: 'hash',
    avatarKey: null,
    timezone: 'UTC',
    language: 'en',
    bio: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let repo: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createInvited: ReturnType<typeof vi.fn>;
  };
  let userInvites: {
    findByTokenHash: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let jwt: { signAsync: ReturnType<typeof vi.fn>; verifyAsync: ReturnType<typeof vi.fn> };
  let redisStore: Map<string, string>;
  let redis: {
    client: {
      get: (k: string) => Promise<string | null>;
      set: (k: string, v: string, _u: string, _t: number) => Promise<'OK'>;
      del: (k: string) => Promise<number>;
      scanStream: (opts: { match: string }) => AsyncIterable<string[]>;
    };
  };
  let presence: {
    forceOffline: ReturnType<typeof vi.fn>;
    resetStatus: ReturnType<typeof vi.fn>;
    disconnectSockets: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    redisStore = new Map();

    repo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      createInvited: vi.fn(),
    };

    userInvites = {
      findByTokenHash: vi.fn(),
      delete: vi.fn(),
    };

    jwt = {
      signAsync: vi
        .fn()
        .mockImplementation(async (payload: object) => `signed.${JSON.stringify(payload)}`),
      verifyAsync: vi.fn(),
    };

    redis = {
      client: {
        get: async (k) => redisStore.get(k) ?? null,
        set: async (k, v) => {
          redisStore.set(k, v);

          return 'OK';
        },
        del: async (k) => (redisStore.delete(k) ? 1 : 0),
        scanStream: async function* () {
          yield [];
        },
      },
    };

    const config = {
      getOrThrow: (key: string) => {
        const env: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_EXPIRY: '15m',
          JWT_REFRESH_EXPIRY: '7d',
        };
        const val = env[key];

        if (val === undefined) {
          throw new Error(`Missing ${key}`);
        }

        return val;
      },
    };

    presence = {
      forceOffline: vi.fn(),
      resetStatus: vi.fn(),
      disconnectSockets: vi.fn().mockResolvedValue(0),
    };

    const avatars = {
      toUserDto: (u: {
        id: string;
        name: string;
        email: string;
        avatarKey: string | null;
        timezone: string;
        language: string;
        bio: string | null;
        createdAt: Date;
      }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatarKey ? `https://cdn.test/${u.avatarKey}` : null,
        timezone: u.timezone,
        language: u.language,
        bio: u.bio,
        createdAt: u.createdAt.toISOString(),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repo },
        { provide: AvatarsService, useValue: avatars },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: RedisService, useValue: redis },
        { provide: UserInviteRepository, useValue: userInvites },
        { provide: PresenceService, useValue: presence },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('acceptUserInvite()', () => {
    function pendingInvite(overrides: Partial<{ expiresAt: Date }> = {}) {
      return {
        id: 'inv1',
        email: 'ada@example.com',
        name: 'Ada',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        invitedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      };
    }

    it('should create a verified account, consume the invite, and issue tokens', async () => {
      userInvites.findByTokenHash.mockResolvedValue(pendingInvite());

      repo.findByEmail.mockResolvedValue(null);

      repo.createInvited.mockImplementation(
        async (data: { passwordHash: string; email: string; name: string }) =>
          makeUser({ email: data.email, name: data.name }),
      );

      const result = await service.acceptUserInvite({ token: 'raw', password: 'secretpass1' });

      expect(result.user.email).toBe('ada@example.com');

      expect(result.tokens.accessToken).toContain('signed.');

      expect(userInvites.delete).toHaveBeenCalledWith('inv1');

      expect(presence.resetStatus).toHaveBeenCalledWith('u1');
      const created = repo.createInvited.mock.calls[0]?.[0] as { passwordHash: string };

      expect(await argon2.verify(created.passwordHash, 'secretpass1')).toBe(true);
    });

    it('should reject an expired invite', async () => {
      userInvites.findByTokenHash.mockResolvedValue(
        pendingInvite({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        service.acceptUserInvite({ token: 'raw', password: 'secretpass1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject when an account with the email already exists', async () => {
      userInvites.findByTokenHash.mockResolvedValue(pendingInvite());

      repo.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.acceptUserInvite({ token: 'raw', password: 'secretpass1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login()', () => {
    it('should return tokens on valid credentials', async () => {
      const hash = await argon2.hash('secretpass1', { type: argon2.argon2id });

      repo.findByEmail.mockResolvedValue(makeUser({ id: 'u1' }));

      (repo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...makeUser(),
        passwordHash: hash,
      });

      const result = await service.login({ email: 'ada@example.com', password: 'secretpass1' });

      expect(result.user.id).toBe('u1');

      expect(presence.resetStatus).toHaveBeenCalledWith('u1');
    });

    it('should reject a wrong password', async () => {
      const hash = await argon2.hash('other', { type: argon2.argon2id });

      repo.findByEmail.mockResolvedValue({ ...makeUser(), passwordHash: hash });

      await expect(
        service.login({ email: 'ada@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should reject an unknown email', async () => {
      repo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh()', () => {
    it('should reject an unknown or revoked refresh token', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti1' });

      await expect(service.refresh('rt')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout()', () => {
    it('should disconnect chat sockets, mark the user offline, and reset status', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti1' });

      redisStore.set('refresh:u1:jti1', 'hashed');

      await service.logout('refresh-token', 'u1');

      expect(presence.disconnectSockets).toHaveBeenCalledWith('u1');

      expect(presence.forceOffline).toHaveBeenCalledWith('u1');

      expect(presence.resetStatus).toHaveBeenCalledWith('u1');
    });

    it('should rely on socket disconnect when live chat sockets exist', async () => {
      presence.disconnectSockets.mockResolvedValue(2);

      await service.logout(undefined, 'u1');

      expect(presence.disconnectSockets).toHaveBeenCalledWith('u1');

      expect(presence.forceOffline).not.toHaveBeenCalled();

      expect(presence.resetStatus).toHaveBeenCalledWith('u1');
    });
  });
});
