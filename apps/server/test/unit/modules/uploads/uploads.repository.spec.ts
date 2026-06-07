import type { Attachment } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '@/database/services/prisma.service';
import { UploadsRepository } from '@/modules/uploads/repositories/uploads.repository';

describe('UploadsRepository', () => {
  let repo: UploadsRepository;
  let attachment: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };

  const sentinel = { id: 'a1' } as Attachment;

  beforeEach(() => {
    attachment = {
      create: vi.fn().mockResolvedValue(sentinel),
      findUnique: vi.fn().mockResolvedValue(sentinel),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
    };
    repo = new UploadsRepository({ attachment } as unknown as PrismaService);
  });

  describe('create()', () => {
    it('should forward the attachment data to prisma', async () => {
      const input = {
        uploaderId: 'u1',
        storageKey: 'k',
        url: 'http://x/k',
        mime: 'image/png',
        size: 10,
        width: null,
        height: null,
      };
      await expect(repo.create(input)).resolves.toBe(sentinel);
      expect(attachment.create).toHaveBeenCalledWith({ data: input });
    });
  });

  describe('findById()', () => {
    it('should query the attachment by id', async () => {
      await repo.findById('a1');
      expect(attachment.findUnique).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });
  });

  describe('claim()', () => {
    it('should only link unclaimed attachments owned by the uploader and return the linked count', async () => {
      const linked = await repo.claim(['a1', 'a2'], 'u1', 'm1');
      expect(attachment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['a1', 'a2'] }, uploaderId: 'u1', messageId: null, chatMessageId: null },
        data: { messageId: 'm1' },
      });
      expect(linked).toBe(2);
    });

    it('should link a chat message via claimForChat, guarding ownership and prior claims', async () => {
      const linked = await repo.claimForChat(['a1', 'a2'], 'u1', 'c1');
      expect(attachment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['a1', 'a2'] }, uploaderId: 'u1', messageId: null, chatMessageId: null },
        data: { chatMessageId: 'c1' },
      });
      expect(linked).toBe(2);
    });
  });
});
