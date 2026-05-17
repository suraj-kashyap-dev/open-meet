import { Injectable } from '@nestjs/common';
import type { Prisma, UserSettings } from '@prisma/client';

import { type PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<UserSettings | null> {
    return this.prisma.userSettings.findUnique({ where: { userId } });
  }

  ensureForUser(userId: string): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  update(
    userId: string,
    data: Prisma.UserSettingsUncheckedUpdateInput,
  ): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { ...(data as Prisma.UserSettingsUncheckedCreateInput), userId },
      update: data,
    });
  }
}
