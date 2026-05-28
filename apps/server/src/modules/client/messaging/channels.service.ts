import { Injectable, NotFoundException } from '@nestjs/common';

import { ApiErrorCode, type MyTeamsResponseDto, type ThreadDto } from '@open-meet/types';

import { ChannelsRepository } from './channels.repository';
import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationsRepository } from './conversations.repository';
import { MessagesRepository } from './messages.repository';
import { MessagingSerializer } from './messaging.serializer';
import { PresenceService } from './presence.service';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly channels: ChannelsRepository,
    private readonly conversations: ConversationsRepository,
    private readonly messages: MessagesRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly presence: PresenceService,
    private readonly serializer: MessagingSerializer,
  ) {}

  async listMyTeams(userId: string): Promise<MyTeamsResponseDto> {
    const teams = await this.channels.teamsForUser(userId);
    const memberIds = [
      ...new Set(teams.flatMap((t) => t.channels.flatMap((c) => c.members.map((m) => m.userId)))),
    ];
    const presence = await this.presence.snapshot(memberIds);

    const items = await Promise.all(
      teams.map(async (t) => ({
        teamId: t.teamId,
        teamName: t.teamName,
        channels: await Promise.all(
          t.channels.map(async (c) => {
            const mine = c.members.find((m) => m.userId === userId);
            const unread = await this.conversations.unreadCount(c.id, userId, mine?.lastReadAt ?? null);
            return this.serializer.conversation(c, {
              viewerId: userId,
              presence,
              lastMessage: c.messages[0] ?? null,
              unreadCount: unread,
            });
          }),
        ),
      })),
    );

    return { items };
  }

  async thread(rootMessageId: string, userId: string): Promise<ThreadDto> {
    const root = await this.messages.findById(rootMessageId);

    if (!root) {
      throw new NotFoundException({
        code: ApiErrorCode.MESSAGE_NOT_FOUND,
        message: 'Message not found.',
      });
    }

    await this.permissions.assertConversationMember(root.conversationId, userId);
    const replies = await this.messages.listReplies(rootMessageId);

    return {
      root: this.serializer.message(root, userId),
      replies: replies.map((r) => this.serializer.message(r, userId)),
    };
  }
}
