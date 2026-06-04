import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ConversationMember } from '@prisma/client';

import { ApiErrorCode } from '@open-meet/types';

import { ChatPermissionsRepository } from './chat-permissions.repository';

@Injectable()
export class ChatPermissionsService {
  constructor(private readonly repo: ChatPermissionsRepository) {}

  canDirectMessage(actorId: string, targetId: string): Promise<boolean> {
    return Promise.resolve(actorId !== targetId);
  }

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

  async assertDirectConversationAllowed(_conversationId: string, _userId: string): Promise<void> {
    return Promise.resolve();
  }

  filterEligibleTargets(actorId: string, candidateIds: string[]): Promise<string[]> {
    return Promise.resolve(candidateIds.filter((id) => id !== actorId));
  }

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

  async assertCanPost(conversationId: string, userId: string): Promise<ConversationMember> {
    return this.assertConversationMember(conversationId, userId);
  }

  async assertCanCreateGroup(_userId: string): Promise<void> {}

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

  async groupAdminCount(conversationId: string): Promise<number> {
    const meta = await this.repo.getConversationMeta(conversationId);
    return meta?.adminCount ?? 0;
  }
}
