import { Injectable } from '@nestjs/common';
import type { WorkspaceSettings } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

const SINGLETON_ID = 'default';

interface ConfigUpdate {
  defaultMeetingTitle?: string;
  allowGuestJoin?: boolean;
  maxMeetingMinutes?: number | null;
}

@Injectable()
export class WorkspaceConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(): Promise<WorkspaceSettings | null> {
    return this.prisma.workspaceSettings.findUnique({ where: { id: SINGLETON_ID } });
  }

  update(data: ConfigUpdate): Promise<WorkspaceSettings> {
    return this.prisma.workspaceSettings.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });
  }
}
