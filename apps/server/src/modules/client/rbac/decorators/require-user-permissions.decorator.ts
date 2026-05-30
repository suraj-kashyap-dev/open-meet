import { SetMetadata } from '@nestjs/common';

import type { UserPermissionKey } from '@open-meet/types';

export const REQUIRE_USER_PERMISSIONS_KEY = 'requireUserPermissions';

/**
 * Annotate a user-facing route handler (or controller) with the permission keys
 * it requires. Keys are typed against the user catalog — typos fail compilation.
 *
 * Per-resource checks (host-of-meeting, member-of-team) still run; both must pass.
 *
 * Example:
 *   ＠RequireUserPermissions('chat.send')
 *   ＠Post('messages')
 *   send(...) { ... }
 */
export const RequireUserPermissions = (
  ...keys: [UserPermissionKey, ...UserPermissionKey[]]
) => SetMetadata(REQUIRE_USER_PERMISSIONS_KEY, keys);
