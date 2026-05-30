import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import { JwtStrategy } from '@/modules/client/auth/strategies/jwt.strategy';

const config = { getOrThrow: () => 'access-secret' } as unknown as ConfigService<ApiEnv, true>;

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy(config);

  describe('validate()', () => {
    it('should map a valid payload to a RequestUser', () => {
      expect(strategy.validate({ sub: 'u1', email: 'a@x.com', name: 'Alice' })).toEqual({
        id: 'u1',
        email: 'a@x.com',
        name: 'Alice',
        isGuest: false,
        guestMeetingCode: null,
        roleId: null,
      });
    });

    it('should carry roleId through to the RequestUser when the payload includes it', () => {
      expect(
        strategy.validate({ sub: 'u1', email: 'a@x.com', name: 'Alice', roleId: 'urole_x' }),
      ).toEqual({
        id: 'u1',
        email: 'a@x.com',
        name: 'Alice',
        isGuest: false,
        guestMeetingCode: null,
        roleId: 'urole_x',
      });
    });

    it('should reject a payload missing sub', () => {
      expect(() => strategy.validate({ sub: '', email: 'a@x.com', name: 'Alice' })).toThrow(
        UnauthorizedException,
      );
    });
  });
});
