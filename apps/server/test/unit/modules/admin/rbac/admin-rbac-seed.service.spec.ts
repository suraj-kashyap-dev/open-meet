import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_ADMIN_MEMBER_PERMISSIONS } from '@open-meet/types';

import {
  AdminRbacSeedService,
  SYSTEM_ADMIN_ROLE_ID,
  SYSTEM_MEMBER_ROLE_ID,
} from '@/modules/admin/rbac/admin-rbac-seed.service';
import type { AdminRoleRepository } from '@/modules/admin/rbac/admin-role.repository';

describe('AdminRbacSeedService', () => {
  let repo: { upsertSystem: ReturnType<typeof vi.fn> };
  let service: AdminRbacSeedService;

  beforeEach(() => {
    repo = { upsertSystem: vi.fn().mockResolvedValue({}) };
    service = new AdminRbacSeedService(repo as unknown as AdminRoleRepository);
  });

  describe('onModuleInit()', () => {
    it('should upsert the Administrator role with permissionType ALL', async () => {
      await service.onModuleInit();
      expect(repo.upsertSystem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SYSTEM_ADMIN_ROLE_ID,
          name: 'Administrator',
          permissionType: 'ALL',
        }),
      );
    });

    it('should upsert the Member role with the documented read-only baseline', async () => {
      await service.onModuleInit();
      expect(repo.upsertSystem).toHaveBeenCalledWith(
        expect.objectContaining({
          id: SYSTEM_MEMBER_ROLE_ID,
          name: 'Member',
          permissionType: 'CUSTOM',
          defaultPermissions: DEFAULT_ADMIN_MEMBER_PERMISSIONS,
        }),
      );
    });

    it('should be idempotent — invoking twice does nothing extra beyond two upserts per call', async () => {
      await service.onModuleInit();
      await service.onModuleInit();
      expect(repo.upsertSystem).toHaveBeenCalledTimes(4);
    });
  });
});
