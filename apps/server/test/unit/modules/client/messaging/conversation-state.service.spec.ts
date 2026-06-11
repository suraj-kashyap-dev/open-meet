import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConversationStateService } from '@/modules/client/messaging/services/conversation-state.service';
import { type ConversationsRepository } from '@/modules/client/messaging/repositories/conversations.repository';
import { type ChatPermissionsService } from '@/modules/client/messaging/services/chat-permissions.service';

describe('ConversationStateService', () => {
  let repo: { updateMemberFlags: ReturnType<typeof vi.fn> };
  let permissions: { assertConversationMember: ReturnType<typeof vi.fn> };
  let service: ConversationStateService;

  beforeEach(() => {
    repo = { updateMemberFlags: vi.fn() };

    permissions = { assertConversationMember: vi.fn() };

    service = new ConversationStateService(
      repo as unknown as ConversationsRepository,
      permissions as unknown as ChatPermissionsService,
    );
  });

  it('should gate on membership and persist only the provided flags', async () => {
    await service.setState('c1', 'u1', { muted: true, pinned: true });

    expect(permissions.assertConversationMember).toHaveBeenCalledWith('c1', 'u1');

    expect(repo.updateMemberFlags).toHaveBeenCalledWith('c1', 'u1', { muted: true, pinned: true });
  });

  it('should pass through a hide flag', async () => {
    await service.setState('c1', 'u1', { hidden: true });

    expect(repo.updateMemberFlags).toHaveBeenCalledWith('c1', 'u1', { hidden: true });
  });

  it('should pass through manualUnread', async () => {
    await service.setState('c1', 'u1', { manualUnread: true });

    expect(repo.updateMemberFlags).toHaveBeenCalledWith('c1', 'u1', { manualUnread: true });
  });
});
