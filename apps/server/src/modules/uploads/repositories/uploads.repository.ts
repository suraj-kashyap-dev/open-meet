import { Injectable } from '@nestjs/common';
import type { Attachment } from '@prisma/client';

import { PrismaService } from '../../../database/services/prisma.service';

export interface CreateAttachmentInput {
  uploaderId: string;
  storageKey: string;
  url: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
}

@Injectable()
export class UploadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateAttachmentInput): Promise<Attachment> {
    return this.prisma.attachment.create({ data: input });
  }

  findById(id: string): Promise<Attachment | null> {
    return this.prisma.attachment.findUnique({ where: { id } });
  }

  async claim(attachmentIds: string[], uploaderId: string, messageId: string): Promise<number> {
    const result = await this.prisma.attachment.updateMany({
      where: { id: { in: attachmentIds }, uploaderId, messageId: null, chatMessageId: null },
      data: { messageId },
    });

    return result.count;
  }

  async claimForChat(
    attachmentIds: string[],
    uploaderId: string,
    chatMessageId: string,
  ): Promise<number> {
    const result = await this.prisma.attachment.updateMany({
      where: { id: { in: attachmentIds }, uploaderId, messageId: null, chatMessageId: null },
      data: { chatMessageId },
    });

    return result.count;
  }
}
