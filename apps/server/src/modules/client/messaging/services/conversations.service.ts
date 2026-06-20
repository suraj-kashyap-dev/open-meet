import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  ApiErrorCode,
  ChatServerEvent,
  type ConversationDto,
  type ConversationListDto,
} from '@open-meet/types';

import { ChatBus, userRoom } from './chat-bus.service';
import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import type {
  ChatMessageWithRelations,
  ConversationWithMembers,
} from '../messaging.includes';
import { MessagingSerializer } from '../messaging.serializer';
import { PresenceService } from './presence.service';

function directKeyFor(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join(':');
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

function laterDate(left: Date | null, right: Date | null): Date | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
}

function sortTimestamp(conversation: ConversationDto): number {
  return new Date(conversation.lastMessageAt ?? conversation.createdAt).getTime();
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly repo: ConversationsRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly presence: PresenceService,
    private readonly serializer: MessagingSerializer,
    private readonly bus: ChatBus,
  ) {}

  membersWithMuteState(conversationId: string): Promise<{ userId: string; muted: boolean }[]> {
    return this.repo.membersWithMuteState(conversationId);
  }

  async list(userId: string, opts: { includeHidden?: boolean } = {}): Promise<ConversationListDto> {
    const all = await this.repo.listForUser(userId);
    const rows = all.filter(
      (c) => opts.includeHidden || !c.members.find((m) => m.userId === userId)?.hidden,
    );

    const memberIds = [...new Set(rows.flatMap((c) => c.members.map((m) => m.userId)))];
    const presence = await this.presence.snapshot(memberIds);

    const items = await Promise.all(
      rows.map((conversation) => this.toDtoWithPresence(conversation, userId, presence)),
    );

    items.sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }

      return sortTimestamp(right) - sortTimestamp(left);
    });

    return { items };
  }

  async getById(conversationId: string, userId: string): Promise<ConversationDto> {
    await this.permissions.assertConversationMember(conversationId, userId);

    await this.permissions.assertDirectConversationAllowed(conversationId, userId);
    const conversation = await this.repo.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        code: ApiErrorCode.CONVERSATION_NOT_FOUND,
        message: 'Conversation not found.',
      });
    }

    return this.toDto(conversation, userId);
  }

  async openDirect(actorId: string, targetId: string): Promise<ConversationDto> {
    await this.permissions.assertCanDirectMessage(actorId, targetId);

    const key = directKeyFor(actorId, targetId);
    let existing = await this.repo.findDirectByKey(key);

    if (existing) {
      const mine = existing.members.find((member) => member.userId === actorId);
      const wasRemoved = Boolean(mine?.removedAt);
      const wasHidden = Boolean(mine?.hidden);

      if (wasRemoved || wasHidden) {
        await this.repo.restoreForViewer(existing.id, actorId, {
          hidden: false,
          removedAt: null,
        });

        existing = (await this.repo.findDirectByKey(key)) ?? existing;
      }

      const dto = await this.toDto(existing, actorId);

      if (wasRemoved) {
        this.bus.emit(userRoom(actorId), ChatServerEvent.CONVERSATION_NEW, dto);
      } else if (wasHidden) {
        this.bus.emit(userRoom(actorId), ChatServerEvent.CONVERSATION_UPDATE, dto);
      }

      return dto;
    }

    let conversation: ConversationWithMembers;

    try {
      conversation = await this.repo.createDirect(actorId, targetId, key);
    } catch (err) {
      if (isUniqueViolation(err)) {
        const found = await this.repo.findDirectByKey(key);

        if (found) {
          return this.toDto(found, actorId);
        }
      }

      throw err;
    }

    const targetDto = await this.toDto(conversation, targetId);

    this.bus.emit(userRoom(targetId), ChatServerEvent.CONVERSATION_NEW, targetDto);

    return this.toDto(conversation, actorId);
  }

  async clearForViewer(conversationId: string, userId: string): Promise<{ ok: true }> {
    await this.permissions.assertConversationMember(conversationId, userId);

    const at = new Date();

    await this.repo.clearForViewer(conversationId, userId, at);

    const conversation = await this.repo.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        code: ApiErrorCode.CONVERSATION_NOT_FOUND,
        message: 'Conversation not found.',
      });
    }

    const dto = await this.toDto(conversation, userId);

    this.bus.emit(userRoom(userId), ChatServerEvent.CONVERSATION_UPDATE, dto);

    return { ok: true };
  }

  async deleteForViewer(conversationId: string, userId: string): Promise<{ ok: true }> {
    await this.permissions.assertConversationMember(conversationId, userId);

    await this.repo.removeForViewer(conversationId, userId, new Date());

    this.bus.emit(userRoom(userId), ChatServerEvent.CONVERSATION_REMOVED, { conversationId });

    return { ok: true };
  }

  async revealOnActivity(conversationId: string, senderId: string): Promise<void> {
    const { revivedUserIds, senderNeedsUpdate } = await this.repo.activityVisibilityChanges(
      conversationId,
      senderId,
    );

    if (revivedUserIds.length === 0 && !senderNeedsUpdate) {
      return;
    }

    const conversation = await this.repo.findById(conversationId);

    if (!conversation) {
      return;
    }

    const memberIds = conversation.members.map((member) => member.userId);
    const presence = await this.presence.snapshot(memberIds);

    for (const userId of revivedUserIds) {
      const dto = await this.toDtoWithPresence(conversation, userId, presence);

      this.bus.emit(userRoom(userId), ChatServerEvent.CONVERSATION_NEW, dto);
    }

    if (senderNeedsUpdate) {
      const dto = await this.toDtoWithPresence(conversation, senderId, presence);

      this.bus.emit(userRoom(senderId), ChatServerEvent.CONVERSATION_UPDATE, dto);
    }
  }

  private async toDto(
    conversation: ConversationWithMembers & { messages?: ChatMessageWithRelations[] },
    viewerId: string,
  ): Promise<ConversationDto> {
    const memberIds = conversation.members.map((m) => m.userId);
    const presence = await this.presence.snapshot(memberIds);

    return this.toDtoWithPresence(conversation, viewerId, presence);
  }

  private async toDtoWithPresence(
    conversation: ConversationWithMembers & { messages?: ChatMessageWithRelations[] },
    viewerId: string,
    presence: Awaited<ReturnType<PresenceService['snapshot']>>,
  ): Promise<ConversationDto> {
    const mine = conversation.members.find((member) => member.userId === viewerId);
    const clearedAt = mine?.clearedAt ?? null;
    const lastMessage = await this.repo.lastVisibleMessage(conversation.id, clearedAt);
    const unreadBase = await this.repo.unreadCount(
      conversation.id,
      viewerId,
      laterDate(mine?.lastReadAt ?? null, clearedAt),
    );
    const unread = mine?.manualUnread ? Math.max(1, unreadBase) : unreadBase;

    return this.serializer.conversation(conversation, {
      viewerId,
      presence,
      lastMessage,
      lastMessageAt: lastMessage?.createdAt ?? null,
      unreadCount: unread,
    });
  }
}
