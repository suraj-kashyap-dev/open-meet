import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationMemberRole } from '@prisma/client';

import { ApiErrorCode, ChatServerEvent, type ConversationDto } from '@open-meet/types';

import { ChatBus, conversationRoom, userRoom } from './chat-bus.service';
import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { GroupsRepository } from '../repositories/groups.repository';
import { MessagingSerializer } from '../messaging.serializer';
import { PresenceService } from './presence.service';

const TITLE_MIN = 1;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 280;

function laterDate(left: Date | null, right: Date | null): Date | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left > right ? left : right;
}

@Injectable()
export class GroupsService {
  constructor(
    private readonly repo: GroupsRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly conversations: ConversationsRepository,
    private readonly serializer: MessagingSerializer,
    private readonly presence: PresenceService,
    private readonly bus: ChatBus,
  ) {}

  async create(
    creatorId: string,
    body: { title: string; description?: string | null; memberIds: string[] },
  ): Promise<ConversationDto> {
    await this.permissions.assertCanCreateGroup(creatorId);

    const title = this.requireTitle(body.title);
    const description = this.normalizeDescription(body.description);

    const invitable = await this.repo.pickInvitableUsers([
      ...new Set(body.memberIds.filter((id) => id && id !== creatorId)),
    ]);
    const eligible = await this.permissions.filterEligibleTargets(creatorId, invitable);

    const conversation = await this.repo.create({
      creatorId,
      title,
      description,
      memberIds: eligible,
    });

    const dto = await this.toDto(conversation.id, creatorId);

    for (const m of conversation.members) {
      const perViewer = m.userId === creatorId ? dto : await this.toDto(conversation.id, m.userId);

      this.bus.emit(userRoom(m.userId), ChatServerEvent.CONVERSATION_NEW, perViewer);
    }

    return dto;
  }

  async update(
    conversationId: string,
    actorId: string,
    body: { title?: string; description?: string | null },
  ): Promise<ConversationDto> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);

    const data: { title?: string; description?: string | null } = {};

    if (body.title !== undefined) {
      data.title = this.requireTitle(body.title);
    }

    if (body.description !== undefined) {
      data.description = this.normalizeDescription(body.description);
    }

    if (Object.keys(data).length > 0) {
      await this.repo.update(conversationId, data);
    }

    return this.broadcastUpdate(conversationId, actorId);
  }

  async addMembers(
    conversationId: string,
    actorId: string,
    userIds: string[],
  ): Promise<ConversationDto> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);

    const existing = new Set(await this.repo.memberUserIds(conversationId));
    const candidate = [...new Set(userIds.filter((id) => id && !existing.has(id)))];
    const invitableRaw = await this.repo.pickInvitableUsers(candidate);
    const invitable = await this.permissions.filterEligibleTargets(actorId, invitableRaw);

    if (invitable.length === 0) {
      return this.toDto(conversationId, actorId);
    }

    await this.repo.addMembers(conversationId, invitable);

    const updatedDto = await this.broadcastUpdate(conversationId, actorId);

    for (const userId of invitable) {
      const perViewer = await this.toDto(conversationId, userId);

      this.bus.emit(userRoom(userId), ChatServerEvent.CONVERSATION_NEW, perViewer);
    }

    return updatedDto;
  }

  async removeMember(conversationId: string, actorId: string, targetUserId: string): Promise<void> {
    const { membership } = await this.permissions.assertGroupAdminOrSelf(
      conversationId,
      actorId,
      targetUserId,
    );

    if (membership.role === ConversationMemberRole.ADMIN && actorId === targetUserId) {
      const admins = await this.permissions.groupAdminCount(conversationId);

      if (admins <= 1) {
        const members = await this.repo.memberUserIds(conversationId);

        if (members.length > 1) {
          throw new BadRequestException({
            code: ApiErrorCode.LAST_ADMIN,
            message: "You're the only admin. Promote someone else before leaving.",
          });
        }
      }
    }

    await this.repo.removeMember(conversationId, targetUserId);

    this.bus.emit(userRoom(targetUserId), ChatServerEvent.CONVERSATION_REMOVED, {
      conversationId,
    });

    await this.broadcastUpdate(conversationId, actorId);
  }

  async updateMemberRole(
    conversationId: string,
    actorId: string,
    targetUserId: string,
    role: ConversationMemberRole,
  ): Promise<ConversationDto> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);

    if (role === ConversationMemberRole.MEMBER) {
      const admins = await this.permissions.groupAdminCount(conversationId);
      const target = await this.permissions.assertConversationMember(conversationId, targetUserId);

      if (target.role === ConversationMemberRole.ADMIN && admins <= 1) {
        throw new BadRequestException({
          code: ApiErrorCode.LAST_ADMIN,
          message: 'Cannot demote the only group admin.',
        });
      }
    }

    await this.repo.setMemberRole(conversationId, targetUserId, role);

    return this.broadcastUpdate(conversationId, actorId);
  }

  async delete(conversationId: string, actorId: string): Promise<void> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);
    const members = await this.repo.memberUserIds(conversationId);

    await this.repo.delete(conversationId);

    for (const userId of members) {
      this.bus.emit(userRoom(userId), ChatServerEvent.CONVERSATION_REMOVED, {
        conversationId,
      });
    }
  }

  private requireTitle(raw: string): string {
    const title = raw.trim();

    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Group name must be ${TITLE_MIN}–${TITLE_MAX} characters.`,
      });
    }

    return title;
  }

  private normalizeDescription(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) {
      return null;
    }

    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      return null;
    }

    if (trimmed.length > DESCRIPTION_MAX) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Description must be ${DESCRIPTION_MAX} characters or fewer.`,
      });
    }

    return trimmed;
  }

  private async toDto(conversationId: string, viewerId: string): Promise<ConversationDto> {
    const conv = await this.repo.findWithMembers(conversationId);

    if (!conv) {
      throw new NotFoundException({
        code: ApiErrorCode.CONVERSATION_NOT_FOUND,
        message: 'Group not found.',
      });
    }

    const memberIds = conv.members.map((m) => m.userId);
    const presence = await this.presence.snapshot(memberIds);
    const mine = conv.members.find((member) => member.userId === viewerId);
    const lastMessage = await this.conversations.lastVisibleMessage(
      conversationId,
      mine?.clearedAt ?? null,
    );
    const unreadBase = await this.conversations.unreadCount(
      conversationId,
      viewerId,
      laterDate(mine?.lastReadAt ?? null, mine?.clearedAt ?? null),
    );
    const unread = mine?.manualUnread ? Math.max(1, unreadBase) : unreadBase;

    return this.serializer.conversation(conv, {
      viewerId,
      presence,
      lastMessage,
      lastMessageAt: lastMessage?.createdAt ?? null,
      unreadCount: unread,
    });
  }

  private async broadcastUpdate(
    conversationId: string,
    actorViewerId: string,
  ): Promise<ConversationDto> {
    const members = await this.repo.memberUserIds(conversationId);
    const actorDto = await this.toDto(conversationId, actorViewerId);

    for (const userId of members) {
      const perViewer =
        userId === actorViewerId ? actorDto : await this.toDto(conversationId, userId);

      this.bus.emit(userRoom(userId), ChatServerEvent.CONVERSATION_UPDATE, perViewer);
    }

    this.bus.emit(conversationRoom(conversationId), ChatServerEvent.CONVERSATION_UPDATE, actorDto);

    return actorDto;
  }
}
