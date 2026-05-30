import { Injectable, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ApiErrorCode } from '@open-meet/types';

import { IS_PUBLIC_KEY } from '../../../../common/decorators/public.decorator';
import type { RequestUser } from '../../../../common/decorators/current-user.decorator';

function isAllowedGuestPath(rawPath: string | undefined): boolean {
  if (!rawPath) {
    return false;
  }

  const path = rawPath.split('?')[0] ?? rawPath;

  return (
    /^\/api\/meetings\/[^/]+\/join$/.test(path) ||
    /^\/api\/meetings\/[^/]+\/leave$/.test(path) ||
    /^\/api\/meetings\/[^/]+\/participants$/.test(path) ||
    /^\/api\/meetings\/[^/]+\/recording\/active$/.test(path) ||
    path === '/api/livekit/token' ||
    path === '/api/uploads'
  );
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{ url?: string }>();
    if (req?.url?.startsWith('/api/admin') || req?.url?.startsWith('/admin')) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      });
    }

    const req = context.switchToHttp().getRequest<{ url?: string }>();
    const authUser = user as unknown as RequestUser;

    if (authUser.isGuest && !isAllowedGuestPath(req?.url)) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Guest access is limited to a single meeting.',
      });
    }

    return user;
  }
}
