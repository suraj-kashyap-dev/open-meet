import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import type { PrismaService } from '@/database/prisma.service';
import { AdminBootstrapService } from '@/modules/admin/bootstrap.service';

vi.mock('argon2', () => ({ hash: vi.fn().mockResolvedValue('HASH'), argon2id: 2 }));

describe('AdminBootstrapService', () => {
  let service: AdminBootstrapService;
  let admin: { count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    admin = { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({}) };
    const config = {
      getOrThrow: (k: string) =>
        ({
          DEFAULT_ADMIN_EMAIL: 'Root@X.COM',
          DEFAULT_ADMIN_PASSWORD: 'secret123',
          DEFAULT_ADMIN_NAME: 'Root',
        })[k],
      get: () => 'test',
    } as unknown as ConfigService<ApiEnv, true>;
    service = new AdminBootstrapService({ admin } as unknown as PrismaService, config);
  });

  describe('onModuleInit()', () => {
    it('should do nothing when an admin already exists', async () => {
      admin.count.mockResolvedValueOnce(1);
      await service.onModuleInit();
      expect(admin.create).not.toHaveBeenCalled();
    });

    it('should create a lowercased SUPERADMIN from DEFAULT_ADMIN_* when none exist', async () => {
      await service.onModuleInit();
      expect(admin.create).toHaveBeenCalledWith({
        data: { email: 'root@x.com', name: 'Root', passwordHash: 'HASH', role: 'SUPERADMIN' },
      });
    });
  });
});
