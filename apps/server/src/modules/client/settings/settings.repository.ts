import { Injectable } from '@nestjs/common';
import type { Prisma, UserSettings } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<UserSettings | null> {
    return this.prisma.userSettings.findUnique({ where: { userId } });
  }

  async disabledNotificationUserIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) {
      return new Set();
    }
    const rows = await this.prisma.userSettings.findMany({
      where: { userId: { in: userIds }, enableNotifications: false },
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  }

  ensureForUser(userId: string): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  update(userId: string, data: Prisma.UserSettingsUncheckedUpdateInput): Promise<UserSettings> {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { ...(data as Prisma.UserSettingsUncheckedCreateInput), userId },
      update: data,
    });
  }
}
