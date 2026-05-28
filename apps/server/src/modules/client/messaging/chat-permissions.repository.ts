import { Injectable } from '@nestjs/common';
import type { ConversationMember } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ChatPermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserBasics(
    userId: string,
  ): Promise<
    {
      id: string;
      name: string;
      chatDisabled: boolean;
      allowDirectMessages: boolean;
    } | null
  > {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        chatDisabled: true,
        settings: { select: { allowDirectMessages: true } },
      },
    }).then((row) =>
      row
        ? {
            id: row.id,
            name: row.name,
            chatDisabled: row.chatDisabled,
            allowDirectMessages: row.settings?.allowDirectMessages ?? true,
          }
        : null,
    );
  }

  /** Whether two users belong to at least one team in common. */
  async shareTeam(userAId: string, userBId: string): Promise<boolean> {
    const count = await this.prisma.teamMember.count({
      where: { userId: userAId, team: { members: { some: { userId: userBId } } } },
    });

    return count > 0;
  }

  /** Whether two users share a conversation (DM, group, or channel). */
  async shareConversation(userAId: string, userBId: string): Promise<boolean> {
    const count = await this.prisma.conversationMember.count({
      where: {
        userId: userAId,
        conversation: { members: { some: { userId: userBId } } },
      },
    });
    return count > 0;
  }

  /** Used by PublicProfile PARTICIPANTS_ONLY visibility: viewer either shares
   * a team OR a conversation with the target. */
  async haveSharedSurface(viewerId: string, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true;
    const [team, conv] = await Promise.all([
      this.shareTeam(viewerId, targetId),
      this.shareConversation(viewerId, targetId),
    ]);
    return team || conv;
  }

  getMembership(conversationId: string, userId: string): Promise<ConversationMember | null> {
    return this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
  }

  async getDirectPeer(
    conversationId: string,
    userId: string,
  ): Promise<{ userId: string; allowDirectMessages: boolean } | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        type: true,
        members: {
          where: { userId: { not: userId } },
          take: 1,
          select: {
            user: {
              select: {
                id: true,
                settings: { select: { allowDirectMessages: true } },
              },
            },
          },
        },
      },
    });

    if (!conversation || conversation.type !== 'DIRECT') {
      return null;
    }

    const peer = conversation.members[0]?.user;

    if (!peer) {
      return null;
    }

    return {
      userId: peer.id,
      allowDirectMessages: peer.settings?.allowDirectMessages ?? true,
    };
  }

  /** Workspace toggle: whether non-admin users may create groups. */
  async getUserCanCreateGroups(): Promise<boolean> {
    const row = await this.prisma.workspaceSettings.findUnique({
      where: { id: 'default' },
      select: { userCanCreateGroups: true },
    });
    return row?.userCanCreateGroups ?? false;
  }

  /** Conversation type + how many ADMIN members remain — used for group rules. */
  async getConversationMeta(
    conversationId: string,
  ): Promise<{ type: string; adminCount: number } | null> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true, members: { where: { role: 'ADMIN' }, select: { userId: true } } },
    });
    if (!conv) return null;
    return { type: conv.type, adminCount: conv.members.length };
  }
}
