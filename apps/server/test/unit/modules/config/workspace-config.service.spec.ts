import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkspaceConfigRepository } from '@/modules/config/workspace-config.repository';
import { WorkspaceConfigService } from '@/modules/config/workspace-config.service';

function setup() {
  const repo = {
    find: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  };
  const service = new WorkspaceConfigService(repo as unknown as WorkspaceConfigRepository);

  return { service, repo };
}

describe('WorkspaceConfigService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('getConfig()', () => {
    it('should return defaults when no settings row exists', async () => {
      ctx.repo.find.mockResolvedValue(null);

      await expect(ctx.service.getConfig()).resolves.toEqual({
        defaultMeetingTitle: 'Untitled meeting',
        allowGuestJoin: true,
        maxMeetingMinutes: null,
      });
    });

    it('should project the stored configuration fields', async () => {
      ctx.repo.find.mockResolvedValue({
        defaultMeetingTitle: 'Standup',
        allowGuestJoin: false,
        maxMeetingMinutes: 45,
      });

      await expect(ctx.service.getConfig()).resolves.toEqual({
        defaultMeetingTitle: 'Standup',
        allowGuestJoin: false,
        maxMeetingMinutes: 45,
      });
    });
  });

  describe('updateConfig()', () => {
    it('should trim the title and only persist provided fields', async () => {
      ctx.repo.find.mockResolvedValue({
        defaultMeetingTitle: 'Standup',
        allowGuestJoin: true,
        maxMeetingMinutes: null,
      });

      await ctx.service.updateConfig({ defaultMeetingTitle: '  Standup  ' });

      expect(ctx.repo.update).toHaveBeenCalledWith({ defaultMeetingTitle: 'Standup' });
    });

    it('should pass through a null cap to clear the limit', async () => {
      ctx.repo.find.mockResolvedValue({
        defaultMeetingTitle: 'Standup',
        allowGuestJoin: true,
        maxMeetingMinutes: null,
      });

      await ctx.service.updateConfig({ maxMeetingMinutes: null });

      expect(ctx.repo.update).toHaveBeenCalledWith({ maxMeetingMinutes: null });
    });
  });
});
