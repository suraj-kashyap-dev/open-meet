import { Injectable } from '@nestjs/common';

import type { ConversationStateDto } from '@open-meet/types';

import { ChatPermissionsService } from './chat-permissions.service';
import { ConversationsRepository } from '../repositories/conversations.repository';

@Injectable()
export class ConversationStateService {
  constructor(
    private readonly conversations: ConversationsRepository,
    private readonly permissions: ChatPermissionsService,
  ) {}

  async setState(
    conversationId: string,
    userId: string,
    state: ConversationStateDto,
  ): Promise<{ ok: true }> {
    await this.permissions.assertConversationMember(conversationId, userId);

    const data: ConversationStateDto = {};
    if (state.muted !== undefined) data.muted = state.muted;
    if (state.pinned !== undefined) data.pinned = state.pinned;
    if (state.hidden !== undefined) data.hidden = state.hidden;
    if (state.manualUnread !== undefined) data.manualUnread = state.manualUnread;

    await this.conversations.updateMemberFlags(conversationId, userId, data);
    return { ok: true };
  }
}
