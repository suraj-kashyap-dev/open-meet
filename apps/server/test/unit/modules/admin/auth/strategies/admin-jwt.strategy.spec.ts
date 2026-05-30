import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import { AdminJwtStrategy } from '@/modules/admin/auth/strategies/admin-jwt.strategy';

const config = { getOrThrow: () => 'admin-secret' } as unknown as ConfigService<ApiEnv, true>;

describe('AdminJwtStrategy', () => {
  const strategy = new AdminJwtStrategy(config);

  describe('validate()', () => {
    it('should map a valid payload to an AdminRequestUser', () => {
      expect(
        strategy.validate({
          sub: 'a1',
          email: 'admin@x.com',
          roleId: 'role_sys_admin',
        }),
      ).toEqual({
        id: 'a1',
        email: 'admin@x.com',
        roleId: 'role_sys_admin',
      });
    });

    it('should default roleId to null when the JWT payload omits it', () => {
      expect(strategy.validate({ sub: 'a1', email: 'admin@x.com' })).toEqual({
        id: 'a1',
        email: 'admin@x.com',
        roleId: null,
      });
    });

    it('should reject a payload missing sub', () => {
      expect(() => strategy.validate({ sub: '', email: 'admin@x.com' })).toThrow(
        UnauthorizedException,
      );
    });
  });
});
