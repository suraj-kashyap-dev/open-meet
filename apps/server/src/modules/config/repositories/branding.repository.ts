import { Injectable } from '@nestjs/common';
import type { WorkspaceSettings } from '@prisma/client';

import { PrismaService } from '../../../database/services/prisma.service';

const SINGLETON_ID = 'default';

@Injectable()
export class BrandingRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(): Promise<WorkspaceSettings | null> {
    return this.prisma.workspaceSettings.findUnique({ where: { id: SINGLETON_ID } });
  }

  setAppName(appName: string): Promise<WorkspaceSettings> {
    return this.prisma.workspaceSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { appName },
      create: { id: SINGLETON_ID, appName },
    });
  }

  setLogoKey(logoKey: string | null): Promise<WorkspaceSettings> {
    return this.prisma.workspaceSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { logoKey },
      create: { id: SINGLETON_ID, logoKey },
    });
  }

  setAccentColor(accentColor: string): Promise<WorkspaceSettings> {
    return this.prisma.workspaceSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { accentColor },
      create: { id: SINGLETON_ID, accentColor },
    });
  }
}
