import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { ApiErrorCode } from '@open-meet/types';

@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {
  override handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Admin authentication required',
      });
    }

    return user;
  }
}
