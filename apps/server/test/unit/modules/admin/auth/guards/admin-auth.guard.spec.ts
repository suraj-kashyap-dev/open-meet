import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AdminAuthGuard } from '@/modules/admin/auth/guards/admin-auth.guard';

describe('AdminAuthGuard', () => {
  const guard = new AdminAuthGuard();

  describe('handleRequest()', () => {
    it('should return the admin when authenticated', () => {
      expect(guard.handleRequest(null, { id: 'a1', role: 'ADMIN' })).toEqual({
        id: 'a1',
        role: 'ADMIN',
      });
    });

    it('should throw Unauthorized when there is no admin or an error', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);

      expect(() => guard.handleRequest(new Error('x'), null)).toThrow(UnauthorizedException);
    });
  });
});
