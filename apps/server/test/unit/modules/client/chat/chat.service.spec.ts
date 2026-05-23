import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StorageService } from '@/storage/storage.service';
import type { UploadsService } from '@/modules/uploads/uploads.service';
import type { ChatRepository, MessageWithSender } from '@/modules/client/chat/chat.repository';
import { ChatService } from '@/modules/client/chat/chat.service';

function makeMessage(over: Partial<MessageWithSender> = {}): MessageWithSender {
  return {
    id: 'msg1',
    meetingId: 'm1',
    senderId: 'u1',
    content: 'hello',
    sentAt: new Date('2026-05-01T12:00:00Z'),
    sender: { id: 'u1', name: 'Alice', avatarKey: 'avatars/u1/x.png' },
    attachments: [],
    ...over,
  } as MessageWithSender;
}

describe('ChatService', () => {
  let service: ChatService;
  let chat: Record<string, ReturnType<typeof vi.fn>>;
  let uploads: { claim: ReturnType<typeof vi.fn>; toDto: ReturnType<typeof vi.fn> };
  let storage: { publicUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    chat = {
      create: vi.fn().mockResolvedValue(makeMessage()),
      findById: vi.fn().mockResolvedValue(makeMessage()),
      listForMeeting: vi.fn().mockResolvedValue([]),
      listMeetingHistory: vi.fn().mockResolvedValue([]),
    };
    uploads = {
      claim: vi.fn().mockResolvedValue(undefined),
      toDto: vi.fn((a: { id: string }) => ({
        id: a.id,
        url: 'u',
        mime: 'm',
        size: 1,
        width: null,
        height: null,
      })),
    };
    storage = { publicUrl: vi.fn((key: string) => `pub:${key}`) };
    service = new ChatService(
      chat as unknown as ChatRepository,
      uploads as unknown as UploadsService,
      storage as unknown as StorageService,
    );
  });

  describe('send()', () => {
    it('should persist the message and claim attachments when present', async () => {
      await service.send({ meetingId: 'm1', senderId: 'u1', content: 'hi', attachmentIds: ['a1'] });
      expect(chat.create).toHaveBeenCalledWith({ meetingId: 'm1', senderId: 'u1', content: 'hi' });
      expect(uploads.claim).toHaveBeenCalledWith(['a1'], 'u1', 'msg1');
    });

    it('should not claim attachments when none are given', async () => {
      await service.send({ meetingId: 'm1', senderId: 'u1', content: 'hi' });
      expect(uploads.claim).not.toHaveBeenCalled();
    });
  });

  describe('toDto() (via send)', () => {
    it('should resolve the sender avatar via storage and map attachments via uploads', async () => {
      chat.findById.mockResolvedValueOnce(makeMessage({ attachments: [{ id: 'a1' }] as never }));
      const dto = await service.send({
        meetingId: 'm1',
        senderId: 'u1',
        content: 'hi',
        attachmentIds: ['a1'],
      });
      expect(dto.sender.avatar).toBe('pub:avatars/u1/x.png');
      expect(dto.attachments).toEqual([
        { id: 'a1', url: 'u', mime: 'm', size: 1, width: null, height: null },
      ]);
    });

    it('should leave the avatar null when the sender has no avatarKey', async () => {
      chat.findById.mockResolvedValueOnce(
        makeMessage({ sender: { id: 'u1', name: 'A', avatarKey: null } }),
      );
      const dto = await service.send({ meetingId: 'm1', senderId: 'u1', content: 'hi' });
      expect(dto.sender.avatar).toBeNull();
    });
  });

  describe('pagedHistory()', () => {
    it('should slice to the page size and return a nextCursor when more rows remain', async () => {
      const rows = [
        makeMessage({ id: 'a', sentAt: new Date('2026-05-01T10:00:00Z') }),
        makeMessage({ id: 'b', sentAt: new Date('2026-05-01T11:00:00Z') }),
        makeMessage({ id: 'c', sentAt: new Date('2026-05-01T12:00:00Z') }),
      ];
      chat.listMeetingHistory.mockResolvedValueOnce(rows);
      const page = await service.pagedHistory('m1', { limit: 2 });
      // requests limit + 1 to detect "more"
      expect(chat.listMeetingHistory).toHaveBeenCalledWith({
        meetingId: 'm1',
        cursor: undefined,
        limit: 3,
      });
      expect(page.items.map((m) => m.id)).toEqual(['b', 'c']);
      expect(page.nextCursor).toBe('2026-05-01T11:00:00.000Z');
    });

    it('should return a null cursor when no more rows remain', async () => {
      chat.listMeetingHistory.mockResolvedValueOnce([makeMessage({ id: 'a' })]);
      const page = await service.pagedHistory('m1', { limit: 50 });
      expect(page.nextCursor).toBeNull();
    });
  });
});
