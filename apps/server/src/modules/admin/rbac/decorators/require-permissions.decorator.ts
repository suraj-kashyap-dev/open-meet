import { SetMetadata } from '@nestjs/common';

import type { AdminPermissionKey } from '@open-meet/types';

export const REQUIRE_ADMIN_PERMISSIONS_KEY = 'requireAdminPermissions';

export const RequirePermissions = (...keys: [AdminPermissionKey, ...AdminPermissionKey[]]) =>
  SetMetadata(REQUIRE_ADMIN_PERMISSIONS_KEY, keys);
