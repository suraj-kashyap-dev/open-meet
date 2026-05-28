import { Injectable } from '@nestjs/common';
import type { ConversationMember } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ChatPermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserBasics(
    userId: string,
  ): Promise<{ id: string; name: string; chatDisabled: boolean } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, chatDisabled: true },
    });
  }

  /** Whether two users belong to at least one team in common. */
  async shareTeam(userAId: string, userBId: string): Promise<boolean> {
    const count = await this.prisma.teamMember.count({
      where: { userId: userAId, team: { members: { some: { userId: userBId } } } },
    });

    return count > 0;
  }

  getMembership(conversationId: string, userId: string): Promise<ConversationMember | null> {
    return this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
  }
}
