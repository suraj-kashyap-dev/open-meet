import {
  BadRequestException,
  Injectable,
  Logger,
  PayloadTooLargeException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

import type { ApiEnv } from '@open-meet/config';
import { ApiErrorCode } from '@open-meet/types';

import { StorageService } from '../../../../storage/services/storage.service';
import { AdminRepository } from '../../repositories/admin.repository';

const ALLOWED_AVATAR_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

interface UploadInput {
  adminId: string;
  buffer: Buffer;
  mime: string;
}

@Injectable()
export class AdminAvatarsService {
  private readonly logger = new Logger(AdminAvatarsService.name);

  private readonly maxSize: number;

  constructor(
    private readonly storage: StorageService,
    private readonly admins: AdminRepository,
    config: ConfigService<ApiEnv, true>,
  ) {
    const configured = config.get<number>('UPLOAD_MAX_SIZE_BYTES') ?? MAX_AVATAR_BYTES;

    this.maxSize = Math.min(configured, MAX_AVATAR_BYTES);
  }

  async upload({ adminId, buffer, mime }: UploadInput): Promise<void> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Avatar file is empty',
      });
    }

    if (buffer.length > this.maxSize) {
      throw new PayloadTooLargeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Avatar exceeds maximum size of ${this.maxSize} bytes`,
      });
    }

    const ext = ALLOWED_AVATAR_MIMES[mime];

    if (!ext) {
      throw new UnsupportedMediaTypeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Avatar must be a PNG, JPEG, WebP, or GIF image (got ${mime})`,
      });
    }

    const existing = await this.admins.findById(adminId);

    if (!existing) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Admin not found',
      });
    }

    const key = `avatars/admins/${adminId}/${randomBytes(12).toString('hex')}.${ext}`;

    await this.storage.put({ key, buffer, mime });

    await this.admins.update(adminId, { avatarKey: key });

    if (existing.avatarKey && existing.avatarKey !== key) {
      this.storage.delete(existing.avatarKey).catch((err: unknown) => {
        this.logger.warn(
          `Failed to delete previous avatar "${existing.avatarKey}": ${(err as Error).message}`,
        );
      });
    }
  }

  async remove(adminId: string): Promise<void> {
    const existing = await this.admins.findById(adminId);

    if (!existing) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Admin not found',
      });
    }

    if (!existing.avatarKey) {
      return;
    }

    const previousKey = existing.avatarKey;

    await this.admins.update(adminId, { avatarKey: null });

    this.storage.delete(previousKey).catch((err: unknown) => {
      this.logger.warn(`Failed to delete avatar "${previousKey}": ${(err as Error).message}`);
    });
  }
}
