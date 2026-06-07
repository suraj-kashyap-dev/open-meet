import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PushDispatchService } from '@/modules/client/push/services/push-dispatch.service';
import { type ConversationsService } from '@/modules/client/messaging/services/conversations.service';
import { type SettingsRepository } from '@/modules/client/settings/repositories/settings.repository';
import { type PushRepository } from '@/modules/client/push/repositories/push.repository';
import { type PushService } from '@/modules/client/push/services/push.service';
import { type ChatBus } from '@/modules/client/messaging/services/chat-bus.service';

describe('PushDispatchService.dispatchChatMessage', () => {
  let conversations: { membersWithMuteState: ReturnType<typeof vi.fn> };
  let settings: { disabledNotificationUserIds: ReturnType<typeof vi.fn> };
  let pushRepo: { userLanguages: ReturnType<typeof vi.fn> };
  let push: { isEnabled: ReturnType<typeof vi.fn>; sendToUser: ReturnType<typeof vi.fn> };
  let bus: { roomHasSockets: ReturnType<typeof vi.fn> };
  let service: PushDispatchService;

  beforeEach(() => {
    conversations = { membersWithMuteState: vi.fn() };
    settings = { disabledNotificationUserIds: vi.fn().mockResolvedValue(new Set()) };
    pushRepo = { userLanguages: vi.fn().mockResolvedValue(new Map()) };
    push = {
      isEnabled: vi.fn().mockReturnValue(true),
      sendToUser: vi.fn().mockResolvedValue(undefined),
    };
    bus = { roomHasSockets: vi.fn().mockResolvedValue(false) };

    service = new PushDispatchService(
      conversations as unknown as ConversationsService,
      settings as unknown as SettingsRepository,
      pushRepo as unknown as PushRepository,
      push as unknown as PushService,
      bus as unknown as ChatBus,
      { translate: () => 'copy' } as never,
      { get: () => 'http://localhost:3000' } as never,
    );
  });

  const job = { conversationId: 'c1', senderId: 'sender', senderName: 'Alice' };

  it('pushes to an offline, unmuted, enabled recipient (excluding the sender)', async () => {
    conversations.membersWithMuteState.mockResolvedValue([
      { userId: 'sender', muted: false },
      { userId: 'bob', muted: false },
    ]);

    await service.dispatchChatMessage(job);

    expect(push.sendToUser).toHaveBeenCalledTimes(1);
    expect(push.sendToUser).toHaveBeenCalledWith('bob', expect.objectContaining({ kind: 'chat' }));
  });

  it('does not push to an online recipient (has live socket)', async () => {
    conversations.membersWithMuteState.mockResolvedValue([{ userId: 'bob', muted: false }]);
    bus.roomHasSockets.mockResolvedValue(true);

    await service.dispatchChatMessage(job);

    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('does not push to a muted member', async () => {
    conversations.membersWithMuteState.mockResolvedValue([{ userId: 'bob', muted: true }]);

    await service.dispatchChatMessage(job);

    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('does not push to a recipient who disabled notifications', async () => {
    conversations.membersWithMuteState.mockResolvedValue([{ userId: 'bob', muted: false }]);
    settings.disabledNotificationUserIds.mockResolvedValue(new Set(['bob']));

    await service.dispatchChatMessage(job);

    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('is a no-op when push is disabled', async () => {
    push.isEnabled.mockReturnValue(false);

    await service.dispatchChatMessage(job);

    expect(conversations.membersWithMuteState).not.toHaveBeenCalled();
    expect(push.sendToUser).not.toHaveBeenCalled();
  });
});
