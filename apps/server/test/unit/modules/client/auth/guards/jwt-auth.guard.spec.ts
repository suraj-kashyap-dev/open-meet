import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '@/modules/client/auth/guards/jwt-auth.guard';

function ctx(url: string): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ url }) }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  describe('canActivate()', () => {
    it('should allow @Public routes without authentication', () => {
      reflector.getAllAndOverride.mockReturnValueOnce(true);
      expect(guard.canActivate(ctx('/api/meetings'))).toBe(true);
    });

    it('should defer /api/admin routes to the admin auth chain', () => {
      expect(guard.canActivate(ctx('/api/admin/users'))).toBe(true);
    });
  });

  describe('handleRequest()', () => {
    it('should return the user when authenticated', () => {
      expect(guard.handleRequest(null, { id: 'u1' })).toEqual({ id: 'u1' });
    });

    it('should throw when there is no user or an error', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(new Error('x'), { id: 'u1' })).toThrow(
        UnauthorizedException,
      );
    });
  });
});
