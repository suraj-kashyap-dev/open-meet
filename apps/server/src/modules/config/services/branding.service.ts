import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

import type { ApiEnv } from '@open-meet/config';
import { ApiErrorCode, type AdminBrandingDto, type PublicConfigDto } from '@open-meet/types';

import { StorageService } from '../../../storage/services/storage.service';
import { BrandingRepository } from '../repositories/branding.repository';

const DEFAULT_APP_NAME = 'Open Meet';
const APP_NAME_MAX = 60;
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const ACCENT_DEFAULT = 'indigo';
const ACCENT_PATTERN = /^(indigo|blue|green|purple|rose|amber|teal|#[0-9a-fA-F]{6})$/;

const LOGO_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class BrandingService {
  constructor(
    private readonly repo: BrandingRepository,
    private readonly storage: StorageService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async getPublicConfig(): Promise<PublicConfigDto> {
    const settings = await this.repo.find();

    return {
      appName: settings?.appName ?? DEFAULT_APP_NAME,
      logoUrl: settings?.logoKey ? this.storage.publicUrl(settings.logoKey) : null,
      gifsEnabled: Boolean(this.config.get('TENOR_API_KEY')),
      accentColor: settings?.accentColor ?? ACCENT_DEFAULT,
    };
  }

  getBranding(): Promise<AdminBrandingDto> {
    return this.getPublicConfig();
  }

  async updateAccentColor(rawAccent: string): Promise<AdminBrandingDto> {
    const accent = rawAccent.trim();

    if (!ACCENT_PATTERN.test(accent)) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'accentColor must be a preset slug or a #RRGGBB hex',
      });
    }

    await this.repo.setAccentColor(accent);

    return this.getBranding();
  }

  async updateAppName(rawAppName: string): Promise<AdminBrandingDto> {
    const appName = rawAppName.trim();

    if (appName.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Application name is required',
      });
    }

    if (appName.length > APP_NAME_MAX) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Application name must be ${APP_NAME_MAX} characters or fewer`,
      });
    }

    await this.repo.setAppName(appName);

    return this.getBranding();
  }

  async setLogo(input: { buffer: Buffer; mime: string }): Promise<AdminBrandingDto> {
    const { buffer, mime } = input;
    const ext = LOGO_MIME_EXT[mime];

    if (!ext) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Logo must be a PNG, JPEG, WebP, or GIF image',
      });
    }

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Uploaded logo is empty',
      });
    }

    if (buffer.length > LOGO_MAX_BYTES) {
      throw new PayloadTooLargeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Logo exceeds maximum size of ${LOGO_MAX_BYTES} bytes`,
      });
    }

    const previous = await this.repo.find();
    const key = `branding/logo_${randomBytes(12).toString('hex')}.${ext}`;

    await this.storage.put({ key, buffer, mime });

    await this.repo.setLogoKey(key);

    if (previous?.logoKey && previous.logoKey !== key) {
      await this.storage.delete(previous.logoKey).catch(() => undefined);
    }

    return this.getBranding();
  }

  async clearLogo(): Promise<AdminBrandingDto> {
    const previous = await this.repo.find();

    if (previous?.logoKey) {
      await this.repo.setLogoKey(null);

      await this.storage.delete(previous.logoKey).catch(() => undefined);
    }

    return this.getBranding();
  }
}
