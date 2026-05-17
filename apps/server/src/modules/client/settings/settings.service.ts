import { Injectable } from '@nestjs/common';
import type { UserSettings } from '@prisma/client';

import type { UserSettingsDto } from '@open-meet/types';

import { SettingsRepository } from './settings.repository';
import type { UpdateUserSettingsBodyDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  async getForUser(userId: string): Promise<UserSettingsDto> {
    const row = await this.repo.ensureForUser(userId);

    return this.toDto(row);
  }

  async update(
    userId: string,
    input: UpdateUserSettingsBodyDto,
  ): Promise<UserSettingsDto> {
    const data: Record<string, unknown> = {};

    if (input.meetingPreferences) {
      for (const [k, v] of Object.entries(input.meetingPreferences)) {
        if (v !== undefined) {
          data[k] = v;
        }
      }
    }

    if (input.privacySettings) {
      for (const [k, v] of Object.entries(input.privacySettings)) {
        if (v !== undefined) {
          data[k] = v;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      const row = await this.repo.ensureForUser(userId);
      return this.toDto(row);
    }

    const updated = await this.repo.update(userId, data);
    return this.toDto(updated);
  }

  toDto(row: UserSettings): UserSettingsDto {
    return {
      meetingPreferences: {
        defaultMicMuted: row.defaultMicMuted,
        defaultCameraOff: row.defaultCameraOff,
        defaultView: row.defaultView,
        enableJoinSound: row.enableJoinSound,
        enableNotifications: row.enableNotifications,
      },
      privacySettings: {
        showEmailToParticipants: row.showEmailToParticipants,
        allowDirectMessages: row.allowDirectMessages,
        profileVisibility: row.profileVisibility,
        shareUsageData: row.shareUsageData,
      },
    };
  }
}
