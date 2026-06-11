import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  isGuest?: boolean;
  guestMeetingCode?: string | null;
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
