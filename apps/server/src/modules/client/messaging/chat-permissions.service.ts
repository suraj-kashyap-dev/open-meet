import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

    if (!(await this.repo.shareTeam(actorId, targetId))) {
      throw new ForbiddenException({
        code: ApiErrorCode.NOT_TEAMMATES,
        message: 'You can only message people on a shared team.',
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
    const user = await this.repo.findUserBasics(userId);

    if (user?.chatDisabled) {
      throw new ForbiddenException({
        code: ApiErrorCode.CHAT_DISABLED,
        message: 'Your chat access has been disabled.',
      });
    }

    return membership;
  }
}
