import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AdminRequestUser } from '@/modules/admin/auth/strategies/admin-jwt.strategy';

export const CurrentAdmin = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AdminRequestUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AdminRequestUser }>();

    return req.user;
  },
);
