import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@/database/prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
    service.$connect = vi.fn().mockResolvedValue(undefined);
    service.$disconnect = vi.fn().mockResolvedValue(undefined);
  });

  describe('onModuleInit()', () => {
    it('should connect on init', async () => {
      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy()', () => {
    it('should disconnect on destroy', async () => {
      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
