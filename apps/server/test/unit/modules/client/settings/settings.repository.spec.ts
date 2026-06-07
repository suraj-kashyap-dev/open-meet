import type { UserSettings } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { SettingsRepository } from '@/modules/client/settings/repositories/settings.repository';

describe('SettingsRepository', () => {
  let repo: SettingsRepository;

  let userSettings: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };

  const sentinel = { userId: 'u1' } as UserSettings;

  beforeEach(() => {
    userSettings = {
      findUnique: vi.fn().mockResolvedValue(sentinel),
      upsert: vi.fn().mockResolvedValue(sentinel),
    };

    repo = new SettingsRepository({ userSettings } as unknown as PrismaService);
  });

  describe('findByUserId()', () => {
    it('should query settings by userId', async () => {
      await repo.findByUserId('u1');
      expect(userSettings.findUnique).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });
  });

  describe('ensureForUser()', () => {
    it('should upsert with an empty update so the row is created idempotently', async () => {
      await repo.ensureForUser('u1');

      expect(userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        create: { userId: 'u1' },
        update: {},
      });
    });
  });

  describe('update()', () => {
    it('should upsert, merging userId into the create branch and using the data as the update', async () => {
      await repo.update('u1', { defaultMicMuted: true });
      expect(userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        create: { defaultMicMuted: true, userId: 'u1' },
        update: { defaultMicMuted: true },
      });
    });
  });
});
