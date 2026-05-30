import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  isGuest?: boolean;
  guestMeetingCode?: string | null;
  /** Client-side RBAC role id (null for guests; null on legacy tokens until reauth). */
  roleId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!req.user) {
      throw new Error('CurrentUser used on route without authenticated user');
    }
    return req.user;
  },
);
