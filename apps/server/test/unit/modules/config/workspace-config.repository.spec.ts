import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { WorkspaceConfigRepository } from '@/modules/config/repositories/workspace-config.repository';

const SINGLETON_ID = 'default';

describe('WorkspaceConfigRepository', () => {
  let repo: WorkspaceConfigRepository;
  let workspaceSettings: Record<string, ReturnType<typeof vi.fn>>;

  const sentinel = { id: SINGLETON_ID };

  beforeEach(() => {
    workspaceSettings = {
      findUnique: vi.fn().mockResolvedValue(sentinel),
      upsert: vi.fn().mockResolvedValue(sentinel),
    };
    repo = new WorkspaceConfigRepository({ workspaceSettings } as unknown as PrismaService);
  });

  describe('find()', () => {
    it('should look up the singleton settings row', async () => {
      await expect(repo.find()).resolves.toBe(sentinel);
      expect(workspaceSettings.findUnique).toHaveBeenCalledWith({ where: { id: SINGLETON_ID } });
    });
  });

  describe('update()', () => {
    it('should upsert the given config onto the singleton', async () => {
      const data = {
        defaultMeetingTitle: 'Standup',
        allowGuestJoin: true,
        maxMeetingMinutes: 60,
      };
      await expect(repo.update(data)).resolves.toBe(sentinel);
      expect(workspaceSettings.upsert).toHaveBeenCalledWith({
        where: { id: SINGLETON_ID },
        update: data,
        create: { id: SINGLETON_ID, ...data },
      });
    });

    it('should pass a partial update through unchanged', async () => {
      await repo.update({ allowGuestJoin: false });
      expect(workspaceSettings.upsert).toHaveBeenCalledWith({
        where: { id: SINGLETON_ID },
        update: { allowGuestJoin: false },
        create: { id: SINGLETON_ID, allowGuestJoin: false },
      });
    });
  });
});
