import { Injectable, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ApiErrorCode } from '@open-meet/types';

import { IS_PUBLIC_KEY } from '../../../../common/decorators/public.decorator';

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

  override handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      });
    }
    return user;
  }
}
