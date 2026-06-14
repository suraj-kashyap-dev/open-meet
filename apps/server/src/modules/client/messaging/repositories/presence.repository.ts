import { Injectable } from '@nestjs/common';
import { PresenceStatus, type UserPresence } from '@prisma/client';

import { PrismaService } from '@/database/services/prisma.service';

@Injectable()
export class PresenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(userId: string, status: PresenceStatus, customText: string | null): Promise<UserPresence> {
    return this.prisma.userPresence.upsert({
      where: { userId },
      create: { userId, status, customText },
      update: { status, customText },
    });
  }

  find(userId: string): Promise<UserPresence | null> {
    return this.prisma.userPresence.findUnique({ where: { userId } });
  }

  findMany(userIds: string[]): Promise<UserPresence[]> {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.userPresence.findMany({ where: { userId: { in: userIds } } });
  }
}
