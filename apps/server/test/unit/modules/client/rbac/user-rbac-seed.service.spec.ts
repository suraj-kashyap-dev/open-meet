import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_USER_MEMBER_PERMISSIONS } from '@open-meet/types';

import {
  SYSTEM_USER_MEMBER_ROLE_ID,
  SYSTEM_USER_RESTRICTED_ROLE_ID,
  UserRbacSeedService,
} from '@/modules/client/rbac/user-rbac-seed.service';
import type { UserRoleRepository } from '@/modules/client/rbac/user-role.repository';

describe('UserRbacSeedService', () => {
  let repo: {
    upsertSystem: ReturnType<typeof vi.fn>;
    ensureDefault: ReturnType<typeof vi.fn>;
  };
  let service: UserRbacSeedService;

  beforeEach(() => {
    repo = {
      upsertSystem: vi.fn().mockResolvedValue({}),
      ensureDefault: vi.fn().mockResolvedValue({}),
    };
    service = new UserRbacSeedService(repo as unknown as UserRoleRepository);
  });

  describe('onModuleInit()', () => {
    it('should upsert Member as the only system user role', async () => {
      await service.onModuleInit();
      expect(repo.upsertSystem).toHaveBeenCalledTimes(1);
      expect(repo.upsertSystem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SYSTEM_USER_MEMBER_ROLE_ID,
          name: 'Member',
          defaultPermissions: DEFAULT_USER_MEMBER_PERMISSIONS,
        }),
      );
    });

    it('should seed Restricted as an editable (non-system) default for guests', async () => {
      await service.onModuleInit();
      expect(repo.ensureDefault).toHaveBeenCalledTimes(1);
      expect(repo.ensureDefault).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SYSTEM_USER_RESTRICTED_ROLE_ID,
          name: 'Restricted',
        }),
      );
      expect(repo.upsertSystem).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: SYSTEM_USER_RESTRICTED_ROLE_ID }),
      );
    });
  });
});
