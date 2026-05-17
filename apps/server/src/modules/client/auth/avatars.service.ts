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
import { ApiErrorCode, type UserDto } from '@open-meet/types';

import { StorageService } from '../../../storage/storage.service';
import { AuthRepository } from './auth.repository';

const ALLOWED_AVATAR_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

interface UploadInput {
  userId: string;
  buffer: Buffer;
  mime: string;
}

@Injectable()
export class AvatarsService {
  private readonly logger = new Logger(AvatarsService.name);

  private readonly maxSize: number;

  constructor(
    private readonly storage: StorageService,
    private readonly users: AuthRepository,
    config: ConfigService<ApiEnv, true>,
  ) {
    const configured = config.get<number>('UPLOAD_MAX_SIZE_BYTES') ?? MAX_AVATAR_BYTES;

    this.maxSize = Math.min(configured, MAX_AVATAR_BYTES);
  }

  async upload({ userId, buffer, mime }: UploadInput): Promise<{ key: string }> {
    if (! buffer || buffer.length === 0) {
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

    if (! ext) {
      throw new UnsupportedMediaTypeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Avatar must be a PNG, JPEG, WebP, or GIF image (got ${mime})`,
      });
    }

    const existing = await this.users.findById(userId);

    if (! existing) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'User not found',
      });
    }

    const key = `avatars/${userId}/${randomBytes(12).toString('hex')}.${ext}`;

    await this.storage.put({ key, buffer, mime });

    await this.users.update(userId, { avatarKey: key });

    if (existing.avatarKey && existing.avatarKey !== key) {
      this.storage.delete(existing.avatarKey).catch((err: unknown) => {
        this.logger.warn(
          `Failed to delete previous avatar "${existing.avatarKey}": ${(err as Error).message}`,
        );
      });
    }

    return { key };
  }

  async remove(userId: string): Promise<void> {
    const existing = await this.users.findById(userId);

    if (! existing) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'User not found',
      });
    }

    if (! existing.avatarKey) {
      return;
    }

    const previousKey = existing.avatarKey;

    await this.users.update(userId, { avatarKey: null });

    this.storage.delete(previousKey).catch((err: unknown) => {
      this.logger.warn(
        `Failed to delete avatar "${previousKey}": ${(err as Error).message}`,
      );
    });
  }

  resolveUrl(avatarKey: string | null): string | null {
    if (! avatarKey) {
      return null;
    }

    return this.storage.publicUrl(avatarKey);
  }

  toUserDto(u: {
    id: string;
    name: string;
    email: string;
    avatarKey: string | null;
    timezone: string;
    language: string;
    bio: string | null;
    createdAt: Date;
  }): UserDto {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: this.resolveUrl(u.avatarKey),
      timezone: u.timezone,
      language: u.language,
      bio: u.bio,
      createdAt: u.createdAt.toISOString(),
    };
  }
}
