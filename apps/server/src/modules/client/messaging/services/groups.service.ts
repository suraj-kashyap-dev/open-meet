import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationMemberRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import type { ApiEnv } from '@open-meet/config';
import {
  ApiErrorCode,
  ChatServerEvent,
  type ConversationDto,
  type ShareHistoryDto,
} from '@open-meet/types';

import { laterDate, resolveHistoryCutoff } from '../../../../common/util/history.util';
import { StorageService } from '../../../../storage/services/storage.service';

import { ChatBus, conversationRoom, userRoom } from './chat-bus.service';
import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { GroupsRepository } from '../repositories/groups.repository';
import { MessagingSerializer } from '../messaging.serializer';
import { PresenceService } from './presence.service';

const TITLE_MIN = 1;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 280;
const ALLOWED_GROUP_AVATAR_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_GROUP_AVATAR_BYTES = 5 * 1024 * 1024;

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  private readonly maxAvatarSize: number;

  constructor(
    private readonly repo: GroupsRepository,
    private readonly permissions: ChatPermissionsService,
    private readonly conversations: ConversationsRepository,
    private readonly serializer: MessagingSerializer,
    private readonly presence: PresenceService,
    private readonly bus: ChatBus,
    private readonly storage: StorageService,
    config: ConfigService<ApiEnv, true>,
  ) {
    const configured = config.get<number>('UPLOAD_MAX_SIZE_BYTES') ?? MAX_GROUP_AVATAR_BYTES;

    this.maxAvatarSize = Math.min(configured, MAX_GROUP_AVATAR_BYTES);
  }

  async create(
    creatorId: string,
    body: { title: string; description?: string | null; memberIds: string[] },
  ): Promise<ConversationDto> {
    await this.permissions.assertCanCreateGroup(creatorId);
    const creator = await this.repo.findUserName(creatorId);

    const title = this.requireTitle(body.title);
    const description = this.normalizeDescription(body.description);

    const invitable = await this.repo.pickInvitableUsers([
      ...new Set(body.memberIds.filter((id) => id && id !== creatorId)),
    ]);
    const eligible = await this.permissions.filterEligibleTargets(creatorId, invitable);

    const conversation = await this.repo.create({
      creatorId,
      creatorName: creator?.name ?? 'Unknown user',
      title,
      description,
      memberIds: eligible,
    });

    await this.repo.audit({
      conversationId: conversation.id,
      action: 'group.created',
      actorUserId: creatorId,
      actorLabel: creator?.name ?? null,
      metadata: { title, memberIds: eligible },
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

      await this.repo.audit({
        conversationId,
        action: 'group.updated',
        actorUserId: actorId,
        metadata: data,
      });
    }

    return this.broadcastUpdate(conversationId, actorId);
  }

  async uploadAvatar(
    conversationId: string,
    actorId: string,
    input: { buffer: Buffer; mime: string },
  ): Promise<ConversationDto> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);

    if (!input.buffer || input.buffer.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Group image file is empty',
      });
    }

    if (input.buffer.length > this.maxAvatarSize) {
      throw new PayloadTooLargeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Group image exceeds maximum size of ${this.maxAvatarSize} bytes`,
      });
    }

    const ext = ALLOWED_GROUP_AVATAR_MIMES[input.mime];

    if (!ext) {
      throw new UnsupportedMediaTypeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Group image must be a PNG, JPEG, WebP, or GIF image (got ${input.mime})`,
      });
    }

    const existing = await this.repo.findById(conversationId);

    if (!existing) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Conversation not found',
      });
    }

    const key = `groups/${conversationId}/avatars/${randomBytes(12).toString('hex')}.${ext}`;

    await this.storage.put({ key, buffer: input.buffer, mime: input.mime });

    await this.repo.update(conversationId, { avatarKey: key });

    await this.repo.audit({
      conversationId,
      action: 'group.avatar_updated',
      actorUserId: actorId,
      metadata: { avatarKey: key },
    });

    if (existing.avatarKey && existing.avatarKey !== key) {
      this.storage.delete(existing.avatarKey).catch((err: unknown) => {
        this.logger.warn(
          `Failed to delete previous group image "${existing.avatarKey}": ${(err as Error).message}`,
        );
      });
    }

    return this.broadcastUpdate(conversationId, actorId);
  }

  async removeAvatar(conversationId: string, actorId: string): Promise<ConversationDto> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);

    const existing = await this.repo.findById(conversationId);

    if (!existing) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Conversation not found',
      });
    }

    if (!existing.avatarKey) {
      return this.toDto(conversationId, actorId);
    }

    const previousKey = existing.avatarKey;

    await this.repo.update(conversationId, { avatarKey: null });

    await this.repo.audit({
      conversationId,
      action: 'group.avatar_removed',
      actorUserId: actorId,
      metadata: { previousKey },
    });

    this.storage.delete(previousKey).catch((err: unknown) => {
      this.logger.warn(`Failed to delete group image "${previousKey}": ${(err as Error).message}`);
    });

    return this.broadcastUpdate(conversationId, actorId);
  }

  async addMembers(
    conversationId: string,
    actorId: string,
    userIds: string[],
    history?: ShareHistoryDto,
  ): Promise<ConversationDto> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);

    const existing = new Set(await this.repo.memberUserIds(conversationId));
    const candidate = [...new Set(userIds.filter((id) => id && !existing.has(id)))];
    const invitableRaw = await this.repo.pickInvitableUsers(candidate);
    const invitable = await this.permissions.filterEligibleTargets(actorId, invitableRaw);

    if (invitable.length === 0) {
      return this.toDto(conversationId, actorId);
    }

    const historyVisibleFrom = resolveHistoryCutoff(history, new Date());

    await this.repo.addMembers(conversationId, invitable, historyVisibleFrom);

    await Promise.all(
      invitable.map((userId) =>
        this.repo.audit({
          conversationId,
          action: 'group.member_added',
          actorUserId: actorId,
          targetUserId: userId,
          metadata: { historyVisibleFrom: historyVisibleFrom?.toISOString() ?? null },
        }),
      ),
    );

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

    if (
      (membership.role === ConversationMemberRole.ADMIN || membership.role === 'OWNER') &&
      actorId === targetUserId
    ) {
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

    await this.repo.audit({
      conversationId,
      action: actorId === targetUserId ? 'group.member_left' : 'group.member_removed',
      actorUserId: actorId,
      targetUserId,
    });

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

    if (role === 'OWNER') {
      return this.transferOwnership(conversationId, actorId, targetUserId);
    }

    if (role === ConversationMemberRole.MEMBER) {
      const admins = await this.permissions.groupAdminCount(conversationId);
      const target = await this.permissions.assertConversationMember(conversationId, targetUserId);

      if (target.role === 'OWNER') {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Transfer ownership before changing the owner role.',
        });
      }

      if (target.role === ConversationMemberRole.ADMIN && admins <= 1) {
        throw new BadRequestException({
          code: ApiErrorCode.LAST_ADMIN,
          message: 'Cannot demote the only group admin.',
        });
      }
    }

    await this.repo.setMemberRole(conversationId, targetUserId, role);

    await this.repo.audit({
      conversationId,
      action: 'group.role_changed',
      actorUserId: actorId,
      targetUserId,
      metadata: { role },
    });

    return this.broadcastUpdate(conversationId, actorId);
  }

  async transferOwnership(
    conversationId: string,
    actorId: string,
    nextOwnerId: string,
  ): Promise<ConversationDto> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);
    const target = await this.permissions.assertConversationMember(conversationId, nextOwnerId);
    const conv = await this.repo.findById(conversationId);

    if (!conv) {
      throw new NotFoundException({
        code: ApiErrorCode.CONVERSATION_NOT_FOUND,
        message: 'Group not found.',
      });
    }

    if (target.role === 'OWNER' && conv.ownerUserId === nextOwnerId) {
      return this.toDto(conversationId, actorId);
    }

    await this.repo.transferOwnership(conversationId, conv.ownerUserId, nextOwnerId);

    await this.repo.audit({
      conversationId,
      action: 'group.owner_transferred',
      actorUserId: actorId,
      targetUserId: nextOwnerId,
      metadata: { previousOwnerUserId: conv.ownerUserId },
    });

    return this.broadcastUpdate(conversationId, actorId);
  }

  async delete(conversationId: string, actorId: string): Promise<void> {
    await this.permissions.assertGroupAdmin(conversationId, actorId);
    const members = await this.repo.memberUserIds(conversationId);

    await this.repo.delete(conversationId, actorId);

    await this.repo.audit({
      conversationId,
      action: 'group.deleted',
      actorUserId: actorId,
    });

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
