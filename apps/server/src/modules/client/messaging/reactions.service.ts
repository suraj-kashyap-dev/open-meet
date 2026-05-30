import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { ApiErrorCode, ChatServerEvent, type ChatMessageDto } from '@open-meet/types';

import { ChatBus, conversationRoom } from './chat-bus.service';
import { ChatPermissionsService } from './chat-permissions.service';
import { MessagesRepository, type ChatMessageMeta } from './messages.repository';
import { MessagingSerializer } from './messaging.serializer';

@Injectable()
export class ReactionsService {
  constructor(
    private readonly messages: MessagesRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly serializer: MessagingSerializer,
    private readonly bus: ChatBus,
  ) {}

  async add(messageId: string, userId: string, emoji: string): Promise<ChatMessageDto> {
    const value = this.normalizeEmoji(emoji);
    const meta = await this.requireMessage(messageId);
    await this.permissions.assertCanPost(meta.conversationId, userId);

    await this.messages.addReaction(messageId, userId, value);
    return this.broadcast(messageId, userId);
  }

  async remove(messageId: string, userId: string, emoji: string): Promise<ChatMessageDto> {
    const value = this.normalizeEmoji(emoji);
    const meta = await this.requireMessage(messageId);
    await this.permissions.assertConversationMember(meta.conversationId, userId);

    await this.messages.removeReaction(messageId, userId, value);
    return this.broadcast(messageId, userId);
  }

  private normalizeEmoji(emoji: string): string {
    const value = emoji.trim();

    if (value.length === 0 || value.length > 32) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Invalid reaction.',
      });
    }

    return value;
  }

  private async requireMessage(messageId: string): Promise<ChatMessageMeta> {
    const meta = await this.messages.findMeta(messageId);

    if (!meta || meta.deletedAt !== null) {
      throw new NotFoundException({
        code: ApiErrorCode.MESSAGE_NOT_FOUND,
        message: 'Message not found.',
      });
    }

    return meta;
  }

  private async broadcast(messageId: string, viewerId: string): Promise<ChatMessageDto> {
    const full = await this.messages.findById(messageId);

    if (!full) {
      throw new NotFoundException({
        code: ApiErrorCode.MESSAGE_NOT_FOUND,
        message: 'Message not found.',
      });
    }

    const dto = this.serializer.message(full, viewerId);

    this.bus.emit(conversationRoom(full.conversationId), ChatServerEvent.REACTION_UPDATED, {
      conversationId: full.conversationId,
      messageId,
      reactions: dto.reactions,
    });

    return dto;
  }
}
