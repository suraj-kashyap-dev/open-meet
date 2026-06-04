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

  /**
   * Eligibility predicate "may A direct-message B?". Chat is open: anyone may
   * message anyone else (only self is excluded). Pure boolean - drives recipient
   * picker scoping and group member-add gating without throwing.
   */
  canDirectMessage(actorId: string, targetId: string): Promise<boolean> {
    return Promise.resolve(actorId !== targetId);
  }

  /**
   * Open DMs: you can start a conversation with anyone. Only self (400) and a
   * missing target (404) are rejected.
   */
  async assertCanDirectMessage(actorId: string, targetId: string): Promise<void> {
    if (actorId === targetId) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'You cannot start a conversation with yourself.',
      });
    }

    const target = await this.repo.findUserBasics(targetId);

    if (!target) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'User not found.',
      });
    }
  }

  /** Chat is open - existing DIRECT threads are always allowed. No-op. */
  async assertDirectConversationAllowed(_conversationId: string, _userId: string): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Returns the subset of `candidateIds` the actor may reach. With open chat
   * that's everyone except the actor themselves.
   */
  filterEligibleTargets(actorId: string, candidateIds: string[]): Promise<string[]> {
    return Promise.resolve(candidateIds.filter((id) => id !== actorId));
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

  /**
   * Write gate: the only requirement to post is being a member of the
   * conversation. Chat is otherwise open.
   */
  async assertCanPost(conversationId: string, userId: string): Promise<ConversationMember> {
    return this.assertConversationMember(conversationId, userId);
  }

  /** Group creation is open to every user - no per-user gate. */
  async assertCanCreateGroup(_userId: string): Promise<void> {
    // Intentionally unrestricted: any authenticated user may create a group.
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

  /** For `DELETE /groups/:id/members/:userId` - the actor either leaves
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
