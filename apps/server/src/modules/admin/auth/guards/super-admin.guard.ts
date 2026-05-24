import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';

import { ApiErrorCode } from '@open-meet/types';

import type { AdminRequestUser } from '../strategies/admin-jwt.strategy';

/**
 * Runs after {@link AdminAuthGuard} (which populates `req.user`) and rejects
 * any admin whose role is not SUPERADMIN. Used to gate admin-account
 * management — inviting, editing, and deleting admins.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AdminRequestUser }>();

    if (req.user?.role !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: 'Superadmin privileges are required for this action',
      });
    }

    return true;
  }
}
