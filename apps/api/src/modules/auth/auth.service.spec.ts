import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import * as argon2 from 'argon2';

import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { RedisService } from '../../redis/redis.service';

function makeUser(overrides: Partial<{ id: string; email: string; name: string }> = {}) {
  return {
    id: 'u1',
    name: 'Ada',
    email: 'ada@example.com',
    passwordHash: 'hash',
    avatar: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let repo: { findByEmail: ReturnType<typeof vi.fn>; findById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
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

  beforeEach(async () => {
    redisStore = new Map();
    repo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };
    jwt = {
      signAsync: vi.fn().mockImplementation(async (payload: object) => `signed.${JSON.stringify(payload)}`),
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
        if (val === undefined) throw new Error(`Missing ${key}`);
        return val;
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: repo },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('hashes password and returns dto + tokens', async () => {
      repo.findByEmail.mockResolvedValue(null);
      repo.create.mockImplementation(async (data: { passwordHash: string; email: string; name: string }) =>
        makeUser({ email: data.email, name: data.name }),
      );

      const result = await service.register({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'secretpass1',
      });

      expect(result.user.email).toBe('ada@example.com');
      expect(result.tokens.accessToken).toContain('signed.');
      expect(result.tokens.refreshToken).toContain('signed.');
      const created = repo.create.mock.calls[0]?.[0] as { passwordHash: string };
      expect(created.passwordHash).not.toBe('secretpass1');
      expect(await argon2.verify(created.passwordHash, 'secretpass1')).toBe(true);
    });

    it('rejects duplicate email', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      await expect(
        service.register({ name: 'Ada', email: 'ada@example.com', password: 'secretpass1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const hash = await argon2.hash('secretpass1', { type: argon2.argon2id });
      repo.findByEmail.mockResolvedValue(makeUser({ id: 'u1' }));
      // monkey-patch user hash
      (repo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...makeUser(),
        passwordHash: hash,
      });

      const result = await service.login({ email: 'ada@example.com', password: 'secretpass1' });
      expect(result.user.id).toBe('u1');
    });

    it('rejects wrong password', async () => {
      const hash = await argon2.hash('other', { type: argon2.argon2id });
      repo.findByEmail.mockResolvedValue({ ...makeUser(), passwordHash: hash });
      await expect(
        service.login({ email: 'ada@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects unknown email', async () => {
      repo.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'ghost@example.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rejects unknown / revoked refresh token', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', jti: 'jti1' });
      await expect(service.refresh('rt')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
