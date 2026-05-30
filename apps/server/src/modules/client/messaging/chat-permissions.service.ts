import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConversationMember } from '@prisma/client';

import { ApiErrorCode } from '@open-meet/types';

import { ChatPermissionsRepository } from './chat-permissions.repository';

/**
 * The single authority for "can A message B?" and "can this user read/post in
 * conversation X?". Both the REST services and the gateway call through here so
 * the rules never diverge. Checks run per-action (never cached on connect)
 * because an admin can flip `chatDisabled` mid-session.
 */
@Injectable()
export class ChatPermissionsService {
  constructor(private readonly repo: ChatPermissionsRepository) {}

  /** Throws unless `actor` may open/continue a 1:1 DM with `target`. */
  async assertCanDirectMessage(actorId: string, targetId: string): Promise<void> {
    if (actorId === targetId) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'You cannot start a conversation with yourself.',
      });
    }

    const [actor, target] = await Promise.all([
      this.repo.findUserBasics(actorId),
      this.repo.findUserBasics(targetId),
    ]);

    if (!target) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'User not found.',
      });
    }

    if (actor?.chatDisabled || target.chatDisabled) {
      throw new ForbiddenException({
        code: ApiErrorCode.CHAT_DISABLED,
        message: 'Direct messages are disabled for this user.',
      });
    }

    if (!target.allowDirectMessages) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: 'This user does not accept direct messages.',
      });
    }

    if (!(await this.repo.haveSharedSurface(actorId, targetId))) {
      throw new ForbiddenException({
        code: ApiErrorCode.NOT_TEAMMATES,
        message: 'You can only message people you share a team or group with.',
      });
    }
  }

  /** Read gate: returns the membership row or throws if the user isn't a member. */
  async assertConversationMember(
    conversationId: string,
    userId: string,
  ): Promise<ConversationMember> {
    const membership = await this.repo.getMembership(conversationId, userId);

    if (!membership) {
      throw new NotFoundException({
        code: ApiErrorCode.CONVERSATION_NOT_FOUND,
        message: 'Conversation not found.',
      });
    }

    return membership;
  }

  /** Write gate: membership plus the user not being chat-disabled. */
  async assertCanPost(conversationId: string, userId: string): Promise<ConversationMember> {
    const membership = await this.assertConversationMember(conversationId, userId);
    const [user, directPeer] = await Promise.all([
      this.repo.findUserBasics(userId),
      this.repo.getDirectPeer(conversationId, userId),
    ]);

    if (user?.chatDisabled) {
      throw new ForbiddenException({
        code: ApiErrorCode.CHAT_DISABLED,
        message: 'Your chat access has been disabled.',
      });
    }

    if (directPeer && !directPeer.allowDirectMessages) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: 'This user does not accept direct messages.',
      });
    }

    return membership;
  }

  /** User-initiated group creation: blocked when the user is chatDisabled or
   * their per-user `canCreateGroups` flag is off. Admins use `/api/admin/groups`. */
  async assertCanCreateGroup(userId: string): Promise<void> {
    const user = await this.repo.findUserBasics(userId);

    if (user?.chatDisabled) {
      throw new ForbiddenException({
        code: ApiErrorCode.CHAT_DISABLED,
        message: 'Your chat access has been disabled.',
      });
    }

    const allowed = await this.repo.getUserCanCreateGroups(userId);
    if (!allowed) {
      throw new ForbiddenException({
        code: ApiErrorCode.GROUPS_DISABLED,
        message: 'You do not have permission to create groups.',
      });
    }
  }

  /** Group-management gate: viewer must be a member with role=ADMIN of a GROUP. */
  async assertGroupAdmin(conversationId: string, userId: string): Promise<ConversationMember> {
    const meta = await this.repo.getConversationMeta(conversationId);
    if (!meta || meta.type !== 'GROUP') {
      throw new NotFoundException({
        code: ApiErrorCode.CONVERSATION_NOT_FOUND,
        message: 'Group not found.',
      });
    }
    const membership = await this.assertConversationMember(conversationId, userId);
    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: ApiErrorCode.NOT_GROUP_ADMIN,
        message: 'Only a group admin can perform this action.',
      });
    }
    return membership;
  }

  /** For `DELETE /groups/:id/members/:userId` — the actor either leaves
   * themselves (actor === target) or, as admin, removes someone else. */
  async assertGroupAdminOrSelf(
    conversationId: string,
    actorId: string,
    targetId: string,
  ): Promise<{ membership: ConversationMember; isAdmin: boolean }> {
    if (actorId === targetId) {
      const membership = await this.assertConversationMember(conversationId, actorId);
      return { membership, isAdmin: membership.role === 'ADMIN' };
    }
    const membership = await this.assertGroupAdmin(conversationId, actorId);
    return { membership, isAdmin: true };
  }

  /** Count of ADMIN members currently in a group (for last-admin guards). */
  async groupAdminCount(conversationId: string): Promise<number> {
    const meta = await this.repo.getConversationMeta(conversationId);
    return meta?.adminCount ?? 0;
  }
}
