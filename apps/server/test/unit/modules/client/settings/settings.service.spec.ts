import type { UserSettings } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SettingsRepository } from '@/modules/client/settings/settings.repository';
import { SettingsService } from '@/modules/client/settings/settings.service';

const row = {
  userId: 'u1',
  defaultMicMuted: true,
  defaultCameraOff: false,
  defaultView: 'grid',
  enableJoinSound: true,
  enableNotifications: true,
  showEmailToParticipants: false,
  allowDirectMessages: true,
  profileVisibility: 'public',
  shareUsageData: false,
} as unknown as UserSettings;

describe('SettingsService', () => {
  let service: SettingsService;
  let repo: { ensureForUser: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = {
      ensureForUser: vi.fn().mockResolvedValue(row),
      update: vi.fn().mockResolvedValue(row),
    };
    service = new SettingsService(repo as unknown as SettingsRepository);
  });

  describe('getForUser()', () => {
    it('should ensure a row exists and return the grouped settings DTO', async () => {
      const dto = await service.getForUser('u1');
      expect(repo.ensureForUser).toHaveBeenCalledWith('u1');
      expect(dto.meetingPreferences.defaultMicMuted).toBe(true);
      expect(dto.privacySettings.profileVisibility).toBe('public');
    });
  });

  describe('update()', () => {
    it('should flatten the preference groups and drop undefined values', async () => {
      await service.update('u1', {
        meetingPreferences: { defaultMicMuted: false, defaultView: undefined },
        privacySettings: { shareUsageData: true },
      } as never);
      expect(repo.update).toHaveBeenCalledWith('u1', {
        defaultMicMuted: false,
        shareUsageData: true,
      });
    });

    it('should fall back to ensureForUser without writing when no concrete fields are given', async () => {
      await service.update('u1', { meetingPreferences: { defaultView: undefined } } as never);
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.ensureForUser).toHaveBeenCalledWith('u1');
    });
  });
});
