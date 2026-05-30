import { Injectable } from '@nestjs/common';

import { ChatServerEvent, type UnreadSummaryDto } from '@open-meet/types';

import { ChatBus, conversationRoom } from './chat-bus.service';
import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationsRepository } from './conversations.repository';
import { MessagesRepository } from './messages.repository';

@Injectable()
export class ReadStateService {
  constructor(
    private readonly conversations: ConversationsRepository,
    private readonly messages: MessagesRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly bus: ChatBus,
  ) {}

  async markRead(
    conversationId: string,
    userId: string,
    messageId?: string,
  ): Promise<{ unread: number }> {
    await this.permissions.assertConversationMember(conversationId, userId);

    let readAt = new Date();

    if (messageId) {
      const meta = await this.messages.findMeta(messageId);

      if (meta && meta.conversationId === conversationId) {
        readAt = meta.createdAt;
      }
    }

    await this.conversations.markRead(conversationId, userId, readAt);

    this.bus.emit(conversationRoom(conversationId), ChatServerEvent.READ_RECEIPT, {
      conversationId,
      userId,
      lastReadAt: readAt.toISOString(),
    });

    const unread = await this.conversations.unreadCount(conversationId, userId, readAt);
    return { unread };
  }

  async summary(userId: string): Promise<UnreadSummaryDto> {
    const memberships = await this.conversations.membershipsForUser(userId);
    const byConversation: Record<string, number> = {};
    let total = 0;

    await Promise.all(
      memberships.map(async (m) => {
        const count = await this.conversations.unreadCount(m.conversationId, userId, m.lastReadAt);

        if (count > 0) {
          byConversation[m.conversationId] = count;
          total += count;
        }
      }),
    );

    return { total, byConversation };
  }
}
