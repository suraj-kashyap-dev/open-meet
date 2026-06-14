import { BadRequestException, Injectable, Logger, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { Attachment } from '@prisma/client';

import type { ApiEnv } from '@open-meet/config';
import { ApiErrorCode, type AttachmentDto } from '@open-meet/types';

import { StorageService } from '@/storage/services/storage.service';
import { UploadsRepository } from '@/modules/uploads/repositories/uploads.repository';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'weba',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

function extensionFor(mime: string, filename: string): string {
  const known = MIME_EXTENSIONS[mime];

  if (known) {
    return known;
  }

  const dot = filename.lastIndexOf('.');

  if (dot >= 0 && dot < filename.length - 1) {
    const raw = filename
      .slice(dot + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (raw.length > 0 && raw.length <= 12) {
      return raw;
    }
  }

  return 'bin';
}

export interface UploadInput {
  uploaderId: string;
  filename: string;
  buffer: Buffer;
  mime: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  private readonly maxSize: number;

  constructor(
    private readonly storage: StorageService,
    private readonly uploads: UploadsRepository,
    config: ConfigService<ApiEnv, true>,
  ) {
    this.maxSize = config.getOrThrow<number>('UPLOAD_MAX_SIZE_BYTES');
  }

  async upload({ uploaderId, filename, buffer, mime }: UploadInput): Promise<AttachmentDto> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Uploaded file is empty',
      });
    }

    if (buffer.length > this.maxSize) {
      throw new PayloadTooLargeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `File exceeds maximum size of ${this.maxSize} bytes`,
      });
    }

    const ext = extensionFor(mime, filename);
    const key = `attachments/${uploaderId}/${randomBytes(12).toString('hex')}.${ext}`;

    await this.storage.put({ key, buffer, mime });

    const attachment = await this.uploads.create({
      uploaderId,
      storageKey: key,
      url: this.storage.publicUrl(key),
      mime,
      size: buffer.length,
      width: null,
      height: null,
    });

    this.logger.debug(`Stored attachment ${attachment.id} (${buffer.length} bytes, ${mime})`);

    return this.toDto(attachment);
  }

  async claim(attachmentIds: string[], uploaderId: string, messageId: string): Promise<void> {
    if (attachmentIds.length === 0) {
      return;
    }

    const linked = await this.uploads.claim(attachmentIds, uploaderId, messageId);

    if (linked < attachmentIds.length) {
      this.logger.warn(
        `Message ${messageId}: only ${linked}/${attachmentIds.length} attachments were claimable for user ${uploaderId}`,
      );
    }
  }

  async claimForChat(
    attachmentIds: string[],
    uploaderId: string,
    chatMessageId: string,
  ): Promise<void> {
    if (attachmentIds.length === 0) {
      return;
    }

    const linked = await this.uploads.claimForChat(attachmentIds, uploaderId, chatMessageId);

    if (linked < attachmentIds.length) {
      this.logger.warn(
        `Chat message ${chatMessageId}: only ${linked}/${attachmentIds.length} attachments were claimable for user ${uploaderId}`,
      );
    }
  }

  toDto(a: Attachment): AttachmentDto {
    return {
      id: a.id,
      url: a.url,
      mime: a.mime,
      size: a.size,
      width: a.width,
      height: a.height,
    };
  }
}
