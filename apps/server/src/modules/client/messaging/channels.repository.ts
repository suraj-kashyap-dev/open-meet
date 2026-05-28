import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

import { conversationListInclude, type ConversationListRow } from './messaging.includes';

export interface TeamWithChannels {
  teamId: string;
  teamName: string;
  channels: ConversationListRow[];
}

@Injectable()
export class ChannelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Teams the user belongs to, each with its channels (CHANNEL conversations). */
  async teamsForUser(userId: string): Promise<TeamWithChannels[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      orderBy: { team: { name: 'asc' } },
      include: {
        team: {
          include: {
            channels: { include: conversationListInclude, orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    return memberships.map((m) => ({
      teamId: m.team.id,
      teamName: m.team.name,
      channels: m.team.channels,
    }));
  }
}
