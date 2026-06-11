import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';

import type { ApiEnv } from '@open-meet/config';
import {
  ApiErrorCode,
  ChatServerEvent,
  type ChatMessageDto,
  type ChatMessagePageDto,
  type ChatMessagePriority,
} from '@open-meet/types';

import { UploadsService } from '../../../uploads/services/uploads.service';

import { ChatBus, conversationRoom } from './chat-bus.service';
import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { ConversationsService } from './conversations.service';
import type { ChatMessageWithRelations } from '../messaging.includes';
import { MessagesRepository, type MentionInput } from '../repositories/messages.repository';
import { MessagingSerializer } from '../messaging.serializer';
import { parseMentions } from '../mentions.util';
import { PinsRepository } from '../repositories/pins.repository';
import { SavedRepository } from '../repositories/saved.repository';
import { PUSH_QUEUE, PushJob } from '../../push/push.constants';
import type { ChatMessageJob } from '../../push/services/push-dispatch.service';

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content?: string;
  attachmentIds?: string[];
  parentId?: string | null;
  priority?: ChatMessagePriority;
  clientNonce?: string;
}

function mentionInputs(content: string): MentionInput[] {
  return parseMentions(content).map((m) => ({ kind: m.kind, mentionedUserId: m.userId }));
}

@Injectable()
export class MessagesService {
  private readonly maxLength: number;

  constructor(
    private readonly messages: MessagesRepository,
    private readonly conversationRepo: ConversationsRepository,
    private readonly conversations: ConversationsService,
    private readonly permissions: ChatPermissionsService,
    private readonly uploads: UploadsService,
    private readonly serializer: MessagingSerializer,
    private readonly bus: ChatBus,
    private readonly pins: PinsRepository,
    private readonly saved: SavedRepository,
    config: ConfigService<ApiEnv, true>,
    @InjectQueue(PUSH_QUEUE) private readonly pushQueue: Queue,
  ) {
    this.maxLength = config.getOrThrow<number>('CHAT_MESSAGE_MAX_LENGTH');
  }

  async history(
    conversationId: string,
    userId: string,
    options: { cursor?: string; limit?: number },
  ): Promise<ChatMessagePageDto> {
    const membership = await this.permissions.assertConversationMember(conversationId, userId);

    await this.permissions.assertDirectConversationAllowed(conversationId, userId);

    const limit = Math.min(100, Math.max(1, options.limit ?? 50));
    const rows = await this.messages.listHistory({
      conversationId,
      clearedAt: membership.clearedAt ?? null,
      cursor: options.cursor,
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(rows.length - limit) : rows;
    const first = slice[0];
    const nextCursor = hasMore && first ? first.createdAt.toISOString() : null;

    const [pinnedIds, savedIds] = await Promise.all([
      this.pins.pinnedIdsForUser(conversationId, userId),
      this.saved.savedIdsForViewer(
        userId,
        slice.map((m) => m.id),
      ),
    ]);
    const flags = {
      pinnedMessageIds: new Set(pinnedIds),
      savedMessageIds: new Set(savedIds),
    };

    return {
      items: slice.map((m) => this.serializer.message(m, userId, flags)),
      nextCursor,
    };
  }

  async send(input: SendMessageInput): Promise<ChatMessageDto> {
    await this.permissions.assertCanPost(input.conversationId, input.senderId);

    await this.permissions.assertDirectConversationAllowed(input.conversationId, input.senderId);

    const content = (input.content ?? '').trim();
    const attachmentIds = input.attachmentIds ?? [];

    if (content.length === 0 && attachmentIds.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'A message needs text or at least one attachment.',
      });
    }

    if (content.length > this.maxLength) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Message exceeds the maximum length of ${this.maxLength} characters.`,
      });
    }

    if (input.parentId) {
      const parent = await this.messages.findMeta(input.parentId);

      if (!parent || parent.conversationId !== input.conversationId) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'The message you are replying to is not in this conversation.',
        });
      }
    }

    const created = await this.messages.create({
      conversationId: input.conversationId,
      senderId: input.senderId,
      content,
      parentId: input.parentId ?? null,
      priority: input.priority,
      mentions: mentionInputs(content),
    });

    if (attachmentIds.length > 0) {
      await this.uploads.claimForChat(attachmentIds, input.senderId, created.id);
    }

    const full = (await this.messages.findById(created.id)) ?? created;

    await this.conversationRepo.touch(input.conversationId, full.createdAt);

    if (input.parentId) {
      await this.messages.bumpReplyCount(input.parentId, full.createdAt);
    }

    await this.conversations.revealOnActivity(input.conversationId, input.senderId);

    return this.broadcastNew(full, input.senderId, input.clientNonce);
  }

  broadcastNew(
    message: ChatMessageWithRelations,
    viewerId: string,
    clientNonce?: string,
  ): ChatMessageDto {
    const dto: ChatMessageDto = {
      ...this.serializer.message(message, viewerId),
      clientNonce: clientNonce ?? null,
    };

    this.bus.emit(conversationRoom(message.conversationId), ChatServerEvent.MESSAGE_NEW, dto);

    const job: ChatMessageJob = {
      conversationId: message.conversationId,
      senderId: viewerId,
      senderName: dto.sender?.name ?? '',
    };

    void this.pushQueue.add(PushJob.CHAT_MESSAGE, job, {
      removeOnComplete: true,
      removeOnFail: 50,
    });

    return dto;
  }

  async edit(messageId: string, userId: string, content: string): Promise<ChatMessageDto> {
    const meta = await this.requireOwnEditable(messageId, userId);

    const trimmed = content.trim();

    if (trimmed.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'A message cannot be empty.',
      });
    }

    if (trimmed.length > this.maxLength) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Message exceeds the maximum length of ${this.maxLength} characters.`,
      });
    }

    const updated = await this.messages.updateContent(meta.id, trimmed, mentionInputs(trimmed));
    const dto = this.serializer.message(updated, userId);

    this.bus.emit(conversationRoom(meta.conversationId), ChatServerEvent.MESSAGE_EDITED, dto);

    return dto;
  }

  async forward(
    messageId: string,
    userId: string,
    targetConversationId: string,
  ): Promise<ChatMessageDto> {
    const source = await this.messages.findById(messageId);

    if (!source || source.deletedAt !== null) {
      throw new NotFoundException({
        code: ApiErrorCode.MESSAGE_NOT_FOUND,
        message: 'Message not found.',
      });
    }

    await this.permissions.assertConversationMember(source.conversationId, userId);

    await this.permissions.assertCanPost(targetConversationId, userId);

    await this.permissions.assertDirectConversationAllowed(targetConversationId, userId);

    const content = source.content.trim();

    if (content.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'This message has no text to forward.',
      });
    }

    const created = await this.messages.create({
      conversationId: targetConversationId,
      senderId: userId,
      content,
      mentions: mentionInputs(content),
    });

    const full = (await this.messages.findById(created.id)) ?? created;

    await this.conversationRepo.touch(targetConversationId, full.createdAt);

    await this.conversations.revealOnActivity(targetConversationId, userId);

    return this.broadcastNew(full, userId);
  }

  async remove(messageId: string, userId: string): Promise<ChatMessageDto> {
    const meta = await this.requireOwnEditable(messageId, userId);

    const deleted = await this.messages.softDelete(meta.id);
    const dto = this.serializer.message(deleted, userId);

    this.bus.emit(conversationRoom(meta.conversationId), ChatServerEvent.MESSAGE_DELETED, {
      conversationId: meta.conversationId,
      messageId: meta.id,
    });

    return dto;
  }

  private async requireOwnEditable(messageId: string, userId: string) {
    const meta = await this.messages.findMeta(messageId);

    if (!meta || meta.deletedAt !== null) {
      throw new NotFoundException({
        code: ApiErrorCode.MESSAGE_NOT_FOUND,
        message: 'Message not found.',
      });
    }

    await this.permissions.assertConversationMember(meta.conversationId, userId);

    if (meta.senderId !== userId) {
      throw new ForbiddenException({
        code: ApiErrorCode.CHAT_FORBIDDEN,
        message: 'You can only modify your own messages.',
      });
    }

    return meta;
  }
}
