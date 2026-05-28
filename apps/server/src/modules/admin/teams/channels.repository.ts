import { Injectable } from '@nestjs/common';
import { ConversationType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

const channelInclude = {
  _count: { select: { members: true } },
} satisfies Prisma.ConversationInclude;

export type ChannelRow = Prisma.ConversationGetPayload<{ include: typeof channelInclude }>;

@Injectable()
export class AdminChannelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(teamId: string): Promise<ChannelRow[]> {
    return this.prisma.conversation.findMany({
      where: { teamId, type: ConversationType.CHANNEL },
      orderBy: [{ isGeneral: 'desc' }, { createdAt: 'asc' }],
      include: channelInclude,
    });
  }

  findById(id: string): Promise<ChannelRow | null> {
    return this.prisma.conversation.findFirst({
      where: { id, type: ConversationType.CHANNEL },
      include: channelInclude,
    });
  }

  async teamMemberIds(teamId: string): Promise<string[]> {
    const rows = await this.prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  create(input: {
    teamId: string;
    name: string;
    description: string | null;
    isGeneral: boolean;
    createdByAdminId: string;
    memberIds: string[];
  }): Promise<ChannelRow> {
    return this.prisma.conversation.create({
      data: {
        type: ConversationType.CHANNEL,
        teamId: input.teamId,
        title: input.name,
        description: input.description,
        isGeneral: input.isGeneral,
        createdByAdminId: input.createdByAdminId,
        members: { create: input.memberIds.map((userId) => ({ userId })) },
      },
      include: channelInclude,
    });
  }

  update(id: string, data: { title?: string; description?: string | null }): Promise<ChannelRow> {
    return this.prisma.conversation.update({ where: { id }, data, include: channelInclude });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.conversation.delete({ where: { id } });
  }
}
