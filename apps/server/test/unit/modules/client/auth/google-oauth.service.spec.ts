import type { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import { GoogleOAuthService } from '@/modules/client/auth/google-oauth.service';
import type { RedisService } from '@/integrations/redis/redis.service';

function makeConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    GOOGLE_OAUTH_CLIENT_ID: 'client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'client-secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:3001/api/auth/google/callback',
    ...overrides,
  };

  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const v = values[key];
      if (!v) throw new Error(`Missing config ${key}`);
      return v;
    },
  } as unknown as ConfigService<ApiEnv, true>;
}

function makeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    service: {
      client: {
        set: async (k: string, v: string) => {
          store.set(k, v);
          return 'OK';
        },
        del: async (k: string) => (store.delete(k) ? 1 : 0),
        get: async (k: string) => store.get(k) ?? null,
      },
    } as unknown as RedisService,
  };
}

describe('GoogleOAuthService', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('isConfigured()', () => {
    it('should return true when the client id and secret are present', () => {
      const svc = new GoogleOAuthService(makeConfig(), makeRedis().service);
      expect(svc.isConfigured()).toBe(true);
    });

    it('should return false when the client id is missing', () => {
      const svc = new GoogleOAuthService(
        makeConfig({ GOOGLE_OAUTH_CLIENT_ID: undefined }),
        makeRedis().service,
      );
      expect(svc.isConfigured()).toBe(false);
    });

    it('should return false when the client secret is missing', () => {
      const svc = new GoogleOAuthService(
        makeConfig({ GOOGLE_OAUTH_CLIENT_SECRET: undefined }),
        makeRedis().service,
      );
      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe('buildAuthorizationUrl()', () => {
    it('should return a Google consent URL with the required query params and store the state', async () => {
      const redis = makeRedis();
      const svc = new GoogleOAuthService(makeConfig(), redis.service);

      const { url, state } = await svc.buildAuthorizationUrl();
      const parsed = new URL(url);

      expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(parsed.searchParams.get('client_id')).toBe('client-id');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'http://localhost:3001/api/auth/google/callback',
      );
      expect(parsed.searchParams.get('scope')).toBe('openid email profile');
      expect(parsed.searchParams.get('state')).toBe(state);
      expect(state).toMatch(/^[a-f0-9]{48}$/);
      expect(redis.store.has(`auth:oauth:google:state:${state}`)).toBe(true);
    });

    it('should throw ServiceUnavailable when Google is not configured', async () => {
      const svc = new GoogleOAuthService(
        makeConfig({ GOOGLE_OAUTH_CLIENT_ID: undefined }),
        makeRedis().service,
      );
      await expect(svc.buildAuthorizationUrl()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('consumeState()', () => {
    it('should delete a valid state from Redis', async () => {
      const redis = makeRedis();
      redis.store.set('auth:oauth:google:state:abc', '1');
      const svc = new GoogleOAuthService(makeConfig(), redis.service);

      await svc.consumeState('abc');

      expect(redis.store.has('auth:oauth:google:state:abc')).toBe(false);
    });

    it('should reject an unknown state', async () => {
      const svc = new GoogleOAuthService(makeConfig(), makeRedis().service);
      await expect(svc.consumeState('does-not-exist')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should reject an empty state', async () => {
      const svc = new GoogleOAuthService(makeConfig(), makeRedis().service);
      await expect(svc.consumeState(undefined)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('exchangeCodeForProfile()', () => {
    it('should return a normalized profile when Google responds with valid user info', async () => {
      const svc = new GoogleOAuthService(makeConfig(), makeRedis().service);

      globalThis.fetch = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'ya29.token', expires_in: 3600 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(
          JSON.stringify({
            sub: '1234567890',
            email: 'Ada@Example.com',
            email_verified: true,
            name: 'Ada Lovelace',
            picture: 'https://example.com/avatar.png',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }) as unknown as typeof fetch;

      const profile = await svc.exchangeCodeForProfile('auth-code');

      expect(profile).toEqual({
        sub: '1234567890',
        email: 'ada@example.com',
        emailVerified: true,
        name: 'Ada Lovelace',
        picture: 'https://example.com/avatar.png',
      });
    });

    it('should reject when Google reports the email as unverified', async () => {
      const svc = new GoogleOAuthService(makeConfig(), makeRedis().service);

      globalThis.fetch = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'ya29.token' }), { status: 200 });
        }

        return new Response(
          JSON.stringify({
            sub: '999',
            email: 'spoof@example.com',
            email_verified: false,
            name: 'Spoofy',
          }),
          { status: 200 },
        );
      }) as unknown as typeof fetch;

      await expect(svc.exchangeCodeForProfile('code')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should reject when the token exchange fails', async () => {
      const svc = new GoogleOAuthService(makeConfig(), makeRedis().service);

      globalThis.fetch = vi.fn(
        async () => new Response('invalid_grant', { status: 400 }),
      ) as unknown as typeof fetch;

      await expect(svc.exchangeCodeForProfile('bad-code')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('should reject empty codes without hitting the network', async () => {
      const svc = new GoogleOAuthService(makeConfig(), makeRedis().service);
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      await expect(svc.exchangeCodeForProfile('')).rejects.toBeInstanceOf(BadRequestException);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
