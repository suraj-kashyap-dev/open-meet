import { Injectable } from '@nestjs/common';

import type { UpdateWorkspaceConfigInput, WorkspaceConfigDto } from '@open-meet/types';

import { WorkspaceConfigRepository } from '@/modules/config/repositories/workspace-config.repository';

const DEFAULTS: WorkspaceConfigDto = {
  defaultMeetingTitle: 'Untitled meeting',
  allowGuestJoin: true,
  maxMeetingMinutes: null,
};

@Injectable()
export class WorkspaceConfigService {
  constructor(private readonly repo: WorkspaceConfigRepository) {}

  async getConfig(): Promise<WorkspaceConfigDto> {
    const settings = await this.repo.find();

    if (!settings) {
      return DEFAULTS;
    }

    return {
      defaultMeetingTitle: settings.defaultMeetingTitle,
      allowGuestJoin: settings.allowGuestJoin,
      maxMeetingMinutes: settings.maxMeetingMinutes,
    };
  }

  async updateConfig(input: UpdateWorkspaceConfigInput): Promise<WorkspaceConfigDto> {
    const data: UpdateWorkspaceConfigInput = {};

    if (input.defaultMeetingTitle !== undefined) {
      data.defaultMeetingTitle = input.defaultMeetingTitle.trim();
    }

    if (input.allowGuestJoin !== undefined) {
      data.allowGuestJoin = input.allowGuestJoin;
    }

    if (input.maxMeetingMinutes !== undefined) {
      data.maxMeetingMinutes = input.maxMeetingMinutes;
    }

    await this.repo.update(data);

    return this.getConfig();
  }
}
