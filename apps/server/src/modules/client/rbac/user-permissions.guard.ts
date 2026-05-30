import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nContext } from 'nestjs-i18n';

import { ApiErrorCode } from '@open-meet/types';

import type { RequestUser } from '../../../common/decorators/current-user.decorator';

import { REQUIRE_USER_PERMISSIONS_KEY } from './decorators/require-user-permissions.decorator';
import { UserPermissionResolver } from './user-permission-resolver.service';

/**
 * Enforces `@RequireUserPermissions(...)` on user-facing routes. Runs after the
 * global `JwtAuthGuard` populates `req.user`.
 *
 * - No metadata → pass (no-op).
 * - Guest user (no roleId) and metadata present → 403.
 * - permissionType `ALL` → bypass.
 * - permissionType `CUSTOM` → every required key must be in the granted set.
 */
@Injectable()
export class UserPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolver: UserPermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRE_USER_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = req.user;
    if (!user || !user.roleId) throw new ForbiddenException(this.denial());

    const resolved = await this.resolver.resolve(user.roleId);
    if (!resolved) throw new ForbiddenException(this.denial());

    if (resolved.permissionType === 'ALL') return true;

    const missing = required.filter((key) => !resolved.granted.has(key));
    if (missing.length > 0) throw new ForbiddenException(this.denial());

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
