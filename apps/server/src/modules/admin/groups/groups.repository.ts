import { Injectable } from '@nestjs/common';
import { ConversationType, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

const groupDetailInclude = {
  members: {
    include: { user: { select: { id: true, name: true, email: true, avatarKey: true } } },
    orderBy: { joinedAt: 'asc' },
  },
  _count: { select: { members: true } },
} satisfies Prisma.ConversationInclude;

const groupListInclude = {
  _count: { select: { members: true } },
} satisfies Prisma.ConversationInclude;

export type GroupDetail = Prisma.ConversationGetPayload<{ include: typeof groupDetailInclude }>;
export type GroupListRow = Prisma.ConversationGetPayload<{ include: typeof groupListInclude }>;

@Injectable()
export class AdminGroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<GroupListRow[]> {
    return this.prisma.conversation.findMany({
      where: { type: ConversationType.GROUP },
      orderBy: { createdAt: 'desc' },
      include: groupListInclude,
    });
  }

  findDetail(id: string): Promise<GroupDetail | null> {
    return this.prisma.conversation.findFirst({
      where: { id, type: ConversationType.GROUP },
      include: groupDetailInclude,
    });
  }

  async create(title: string, createdByAdminId: string, memberIds: string[]): Promise<GroupDetail> {
    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title,
        createdByAdminId,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
      include: groupDetailInclude,
    });

    return conversation;
  }

  update(id: string, title: string): Promise<GroupDetail> {
    return this.prisma.conversation.update({
      where: { id },
      data: { title },
      include: groupDetailInclude,
    });
  }

  async addMembers(id: string, userIds: string[]): Promise<void> {
    await this.prisma.conversationMember.createMany({
      data: userIds.map((userId) => ({ conversationId: id, userId })),
      skipDuplicates: true,
    });
  }

  async removeMember(id: string, userId: string): Promise<void> {
    await this.prisma.conversationMember.deleteMany({ where: { conversationId: id, userId } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.conversation.delete({ where: { id } });
  }
}
