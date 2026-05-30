import { Injectable, NotFoundException } from '@nestjs/common';

import { ApiErrorCode, type SavedMessageListDto } from '@open-meet/types';

import { ChatPermissionsService } from './chat-permissions.service';
import { MessagesRepository } from './messages.repository';
import { MessagingSerializer } from './messaging.serializer';
import { SavedRepository } from './saved.repository';

@Injectable()
export class SavedService {
  constructor(
    private readonly saved: SavedRepository,
    private readonly messages: MessagesRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly serializer: MessagingSerializer,
  ) {}

  async save(messageId: string, userId: string): Promise<{ saved: true }> {
    await this.assertMessageMember(messageId, userId);
    await this.saved.save(userId, messageId);
    return { saved: true };
  }

  async unsave(messageId: string, userId: string): Promise<{ saved: false }> {
    await this.saved.unsave(userId, messageId);
    return { saved: false };
  }

  async list(userId: string): Promise<SavedMessageListDto> {
    const rows = await this.saved.listSaved(userId);
    const savedMessageIds = new Set(rows.map((r) => r.message.id));

    return {
      items: rows.map((row) => ({
        message: this.serializer.message(row.message, userId, { savedMessageIds }),
        conversationId: row.message.conversationId,
        conversationTitle: row.message.conversation.title,
      })),
    };
  }

  private async assertMessageMember(messageId: string, userId: string): Promise<void> {
    const meta = await this.messages.findMeta(messageId);

    if (!meta) {
      throw new NotFoundException({
        code: ApiErrorCode.MESSAGE_NOT_FOUND,
        message: 'Message not found.',
      });
    }

    await this.permissions.assertConversationMember(meta.conversationId, userId);
  }
}
