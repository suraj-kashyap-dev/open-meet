import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { ChatRepository } from '@/modules/client/chat/repositories/chat.repository';

const include = {
  sender: { select: { id: true, name: true, avatarKey: true } },
  attachments: true,
};

describe('ChatRepository', () => {
  let repo: ChatRepository;
  let message: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    message = {
      create: vi.fn().mockResolvedValue({ id: 'msg1' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'msg1' }),
      findMany: vi.fn().mockResolvedValue([]),
    };
    repo = new ChatRepository({ message } as unknown as PrismaService);
  });

  describe('create()', () => {
    it('should persist the message and include the sender and attachments', async () => {
      const data = { meetingId: 'm1', senderId: 'u1', content: 'hi' };
      await repo.create(data);
      expect(message.create).toHaveBeenCalledWith({ data, include });
    });
  });

  describe('listForMeeting()', () => {
    it('should order ascending and cap the number of rows returned', async () => {
      await repo.listForMeeting('m1');
      expect(message.findMany).toHaveBeenCalledWith({
        where: { meetingId: 'm1' },
        orderBy: { sentAt: 'asc' },
        take: 100,
        include,
      });
    });
  });

  describe('listMeetingHistory()', () => {
    it('should query newest-first then reverse to chronological order when no cursor is given', async () => {
      message.findMany.mockResolvedValueOnce([{ id: 'b' }, { id: 'a' }]);
      const rows = await repo.listMeetingHistory({ meetingId: 'm1', limit: 50 });
      expect(message.findMany).toHaveBeenCalledWith({
        where: { meetingId: 'm1' },
        orderBy: { sentAt: 'desc' },
        take: 50,
        include,
      });
      expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    });

    it('should add a sentAt < cursor filter when a cursor is provided', async () => {
      const cursor = '2026-01-01T00:00:00.000Z';
      await repo.listMeetingHistory({ meetingId: 'm1', cursor, limit: 10 });
      expect(message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { meetingId: 'm1', sentAt: { lt: new Date(cursor) } },
        }),
      );
    });
  });
});
