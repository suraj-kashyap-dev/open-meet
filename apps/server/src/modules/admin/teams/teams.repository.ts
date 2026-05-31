import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

const memberInclude = {
  user: { select: { id: true, name: true, email: true, avatarKey: true } },
} satisfies Prisma.TeamMemberInclude;

const teamInclude = {
  responsibleAdmin: { select: { id: true, name: true } },
  _count: { select: { members: true } },
} satisfies Prisma.TeamInclude;

export type TeamMemberWithUser = Prisma.TeamMemberGetPayload<{ include: typeof memberInclude }>;
export type TeamWithCount = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

export interface TeamWriteData {
  name?: string;
  description?: string | null;
  responsibleAdminId?: string | null;
}

@Injectable()
export class AdminTeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<TeamWithCount[]> {
    return this.prisma.team.findMany({ orderBy: { name: 'asc' }, include: teamInclude });
  }

  findWithCount(id: string): Promise<TeamWithCount | null> {
    return this.prisma.team.findUnique({ where: { id }, include: teamInclude });
  }

  create(data: {
    name: string;
    description: string | null;
    responsibleAdminId: string | null;
  }): Promise<TeamWithCount> {
    return this.prisma.team.create({ data, include: teamInclude });
  }

  update(id: string, data: TeamWriteData): Promise<TeamWithCount> {
    return this.prisma.team.update({ where: { id }, data, include: teamInclude });
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

  adminExists(id: string): Promise<boolean> {
    return this.prisma.admin.count({ where: { id } }).then((c) => c > 0);
  }
}
