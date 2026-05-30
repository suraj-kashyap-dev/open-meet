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
import { ConversationsRepository } from './conversations.repository';
import type { ChatMessageWithRelations, ConversationWithMembers } from './messaging.includes';
import { MessagingSerializer } from './messaging.serializer';
import { PresenceService } from './presence.service';

function directKeyFor(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join(':');
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
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

  async list(userId: string, opts: { includeHidden?: boolean } = {}): Promise<ConversationListDto> {
    const all = await this.repo.listForUser(userId);
    // Hide conversations the viewer has hidden unless the caller explicitly
    // asks for them (the "Show hidden" filter); pinned ones sort to the top.
    const rows = all
      .filter((c) => opts.includeHidden || !c.members.find((m) => m.userId === userId)?.hidden)
      .sort((a, b) => {
        const ap = a.members.find((m) => m.userId === userId)?.pinned ? 1 : 0;
        const bp = b.members.find((m) => m.userId === userId)?.pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0);
      });

    const memberIds = [...new Set(rows.flatMap((c) => c.members.map((m) => m.userId)))];
    const presence = await this.presence.snapshot(memberIds);

    const items = await Promise.all(
      rows.map(async (c) => {
        const mine = c.members.find((m) => m.userId === userId);
        const count = await this.repo.unreadCount(c.id, userId, mine?.lastReadAt ?? null);
        const unread = mine?.manualUnread ? Math.max(1, count) : count;

        return this.serializer.conversation(c, {
          viewerId: userId,
          presence,
          lastMessage: c.messages[0] ?? null,
          unreadCount: unread,
        });
      }),
    );

    return { items };
  }

  async getById(conversationId: string, userId: string): Promise<ConversationDto> {
    await this.permissions.assertConversationMember(conversationId, userId);
    const conversation = await this.repo.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException({
        code: ApiErrorCode.CONVERSATION_NOT_FOUND,
        message: 'Conversation not found.',
      });
    }

    return this.toDto(conversation, userId, null);
  }

  /** Get-or-create the 1:1 conversation between the actor and the target. */
  async openDirect(actorId: string, targetId: string): Promise<ConversationDto> {
    await this.permissions.assertCanDirectMessage(actorId, targetId);

    const key = directKeyFor(actorId, targetId);
    const existing = await this.repo.findDirectByKey(key);

    if (existing) {
      return this.toDto(existing, actorId);
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

    // Notify the target so a new thread appears in their list without a refresh.
    const targetDto = await this.toDto(conversation, targetId);
    this.bus.emit(userRoom(targetId), ChatServerEvent.CONVERSATION_NEW, targetDto);

    return this.toDto(conversation, actorId);
  }

  private async toDto(
    conversation: ConversationWithMembers & { messages?: ChatMessageWithRelations[] },
    viewerId: string,
    lastMessage: ChatMessageWithRelations | null = null,
  ): Promise<ConversationDto> {
    const memberIds = conversation.members.map((m) => m.userId);
    const presence = await this.presence.snapshot(memberIds);
    const mine = conversation.members.find((m) => m.userId === viewerId);
    const unread = await this.repo.unreadCount(conversation.id, viewerId, mine?.lastReadAt ?? null);

    return this.serializer.conversation(conversation, {
      viewerId,
      presence,
      lastMessage,
      unreadCount: unread,
    });
  }
}
