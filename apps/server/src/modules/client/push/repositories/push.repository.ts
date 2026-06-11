import { Injectable } from '@nestjs/common';
import type { PushSubscription } from '@prisma/client';

import { PrismaService } from '../../../../database/services/prisma.service';

@Injectable()
export class PushRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsert(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }): Promise<PushSubscription> {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
      update: {
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        lastSeenAt: new Date(),
      },
    });
  }

  findManyByUserId(userId: string): Promise<PushSubscription[]> {
    return this.prisma.pushSubscription.findMany({ where: { userId } });
  }

  async deleteByEndpoint(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async deleteByEndpoints(endpoints: string[]): Promise<void> {
    if (endpoints.length === 0) {
      return;
    }

    await this.prisma.pushSubscription.deleteMany({ where: { endpoint: { in: endpoints } } });
  }

  async userLanguages(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, language: true },
    });

    return new Map(rows.map((r) => [r.id, r.language]));
  }
}
