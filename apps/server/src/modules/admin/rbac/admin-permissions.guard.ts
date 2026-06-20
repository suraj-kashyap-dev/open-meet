import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nContext } from 'nestjs-i18n';

import { ApiErrorCode } from '@open-meet/types';

import type { AdminRequestUser } from '../auth/strategies/admin-jwt.strategy';

import { AdminPermissionResolver } from './services/admin-permission-resolver.service';
import { REQUIRE_ADMIN_PERMISSIONS_KEY } from './decorators/require-permissions.decorator';

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolver: AdminPermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRE_ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ user?: AdminRequestUser }>();
    const user = req.user;

    if (!user) {
      throw new InternalServerErrorException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'PermissionsGuard ran without an authenticated admin',
      });
    }

    if (!user.roleId) {
      throw new ForbiddenException(this.denial());
    }

    const resolved = await this.resolver.resolve(user.roleId);

    if (!resolved) {
      throw new ForbiddenException(this.denial());
    }

    if (resolved.permissionType === 'ALL') {
      return true;
    }

    const missing = required.filter((key) => !resolved.granted.has(key));

    if (missing.length > 0) {
      throw new ForbiddenException(this.denial());
    }

    return true;
  }

  private denial(): { code: string; message: string } {
    return {
      code: ApiErrorCode.FORBIDDEN,
      message:
        I18nContext.current()?.t('errors.permission-required') ??
        'You do not have permission to perform this action.',
    };
  }
}
