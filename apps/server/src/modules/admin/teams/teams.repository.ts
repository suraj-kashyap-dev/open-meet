import { Injectable } from '@nestjs/common';
import { ConversationType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

const memberInclude = {
  user: { select: { id: true, name: true, email: true, avatarKey: true } },
} satisfies Prisma.TeamMemberInclude;

export type TeamMemberWithUser = Prisma.TeamMemberGetPayload<{ include: typeof memberInclude }>;
export type TeamWithCount = Prisma.TeamGetPayload<{ include: { _count: { select: { members: true } } } }>;

@Injectable()
export class AdminTeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<TeamWithCount[]> {
    return this.prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: true } } },
    });
  }

  findWithCount(id: string): Promise<TeamWithCount | null> {
    return this.prisma.team.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
  }

  create(name: string): Promise<TeamWithCount> {
    return this.prisma.team.create({
      data: { name },
      include: { _count: { select: { members: true } } },
    });
  }

  update(id: string, name: string): Promise<TeamWithCount> {
    return this.prisma.team.update({
      where: { id },
      data: { name },
      include: { _count: { select: { members: true } } },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.team.delete({ where: { id } });
  }

  members(teamId: string): Promise<TeamMemberWithUser[]> {
    return this.prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { joinedAt: 'asc' },
      include: memberInclude,
    });
  }

  async addMembers(teamId: string, userIds: string[]): Promise<void> {
    await this.prisma.teamMember.createMany({
      data: userIds.map((userId) => ({ teamId, userId })),
      skipDuplicates: true,
    });
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await this.prisma.teamMember.deleteMany({ where: { teamId, userId } });
  }

  // --- Keep channel membership in lockstep with team membership ---

  private async channelIds(teamId: string): Promise<string[]> {
    const rows = await this.prisma.conversation.findMany({
      where: { teamId, type: ConversationType.CHANNEL },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async addMembersToChannels(teamId: string, userIds: string[]): Promise<void> {
    const ids = await this.channelIds(teamId);
    if (ids.length === 0 || userIds.length === 0) return;

    await this.prisma.conversationMember.createMany({
      data: ids.flatMap((conversationId) => userIds.map((userId) => ({ conversationId, userId }))),
      skipDuplicates: true,
    });
  }

  async removeMemberFromChannels(teamId: string, userId: string): Promise<void> {
    const ids = await this.channelIds(teamId);
    if (ids.length === 0) return;

    await this.prisma.conversationMember.deleteMany({
      where: { conversationId: { in: ids }, userId },
    });
  }
}
