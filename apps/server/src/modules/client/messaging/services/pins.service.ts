import { Injectable, NotFoundException } from '@nestjs/common';

import { ApiErrorCode, ChatServerEvent, type PinnedMessageListDto } from '@open-meet/types';

import { ChatBus, userRoom } from './chat-bus.service';
import { ChatPermissionsService } from './chat-permissions.service';
import { MessagesRepository } from '../repositories/messages.repository';
import { MessagingSerializer } from '../messaging.serializer';
import { PinsRepository } from '../repositories/pins.repository';

@Injectable()
export class PinsService {
  constructor(
    private readonly pins: PinsRepository,
    private readonly messages: MessagesRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly serializer: MessagingSerializer,
    private readonly bus: ChatBus,
  ) {}

  async pin(messageId: string, userId: string): Promise<{ pinned: true }> {
    const conversationId = await this.assertMessageMember(messageId, userId);

    await this.pins.pin(conversationId, messageId, userId);

    this.broadcast(conversationId, messageId, true, userId);

    return { pinned: true };
  }

  async unpin(messageId: string, userId: string): Promise<{ pinned: false }> {
    const conversationId = await this.assertMessageMember(messageId, userId);

    await this.pins.unpin(messageId, userId);

    this.broadcast(conversationId, messageId, false, userId);

    return { pinned: false };
  }

  async list(conversationId: string, userId: string): Promise<PinnedMessageListDto> {
    await this.permissions.assertConversationMember(conversationId, userId);
    const rows = await this.pins.listPinned(conversationId, userId);
    const pinnedMessageIds = new Set(rows.map((r) => r.id));

    return { items: rows.map((r) => this.serializer.message(r, userId, { pinnedMessageIds })) };
  }

  private async assertMessageMember(messageId: string, userId: string): Promise<string> {
    const meta = await this.messages.findMeta(messageId);

    if (!meta) {
      throw new NotFoundException({
        code: ApiErrorCode.MESSAGE_NOT_FOUND,
        message: 'Message not found.',
      });
    }

    await this.permissions.assertConversationMember(meta.conversationId, userId);

    return meta.conversationId;
  }

  private broadcast(
    conversationId: string,
    messageId: string,
    pinned: boolean,
    userId: string,
  ): void {
    this.bus.emit(userRoom(userId), ChatServerEvent.PIN_UPDATE, {
      conversationId,
      messageId,
      pinned,
    });
  }
}
