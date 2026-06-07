import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { BrandingRepository } from '@/modules/config/repositories/branding.repository';

const SINGLETON_ID = 'default';

describe('BrandingRepository', () => {
  let repo: BrandingRepository;
  let workspaceSettings: Record<string, ReturnType<typeof vi.fn>>;

  const sentinel = { id: SINGLETON_ID };

  beforeEach(() => {
    workspaceSettings = {
      findUnique: vi.fn().mockResolvedValue(sentinel),
      upsert: vi.fn().mockResolvedValue(sentinel),
    };
    repo = new BrandingRepository({ workspaceSettings } as unknown as PrismaService);
  });

  describe('find()', () => {
    it('should look up the singleton settings row', async () => {
      await expect(repo.find()).resolves.toBe(sentinel);
      expect(workspaceSettings.findUnique).toHaveBeenCalledWith({ where: { id: SINGLETON_ID } });
    });
  });

  describe('setAppName()', () => {
    it('should upsert the app name on the singleton', async () => {
      await repo.setAppName('OpenMeet');
      expect(workspaceSettings.upsert).toHaveBeenCalledWith({
        where: { id: SINGLETON_ID },
        update: { appName: 'OpenMeet' },
        create: { id: SINGLETON_ID, appName: 'OpenMeet' },
      });
    });
  });

  describe('setLogoKey()', () => {
    it('should upsert the logo key', async () => {
      await repo.setLogoKey('logo/key');
      expect(workspaceSettings.upsert).toHaveBeenCalledWith({
        where: { id: SINGLETON_ID },
        update: { logoKey: 'logo/key' },
        create: { id: SINGLETON_ID, logoKey: 'logo/key' },
      });
    });

    it('should accept a null logo key to clear it', async () => {
      await repo.setLogoKey(null);
      expect(workspaceSettings.upsert).toHaveBeenCalledWith({
        where: { id: SINGLETON_ID },
        update: { logoKey: null },
        create: { id: SINGLETON_ID, logoKey: null },
      });
    });
  });

  describe('setAccentColor()', () => {
    it('should upsert the accent color', async () => {
      await repo.setAccentColor('#ff0000');
      expect(workspaceSettings.upsert).toHaveBeenCalledWith({
        where: { id: SINGLETON_ID },
        update: { accentColor: '#ff0000' },
        create: { id: SINGLETON_ID, accentColor: '#ff0000' },
      });
    });
  });
});
