import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BrandingRepository } from '@/modules/config/branding.repository';
import { BrandingService } from '@/modules/config/branding.service';
import type { StorageService } from '@/storage/storage.service';

function setup() {
  const repo = {
    find: vi.fn(),
    setAppName: vi.fn().mockResolvedValue(undefined),
    setLogoKey: vi.fn().mockResolvedValue(undefined),
  };
  const storage = {
    put: vi.fn().mockResolvedValue({ url: 'stored' }),
    publicUrl: vi.fn((key: string) => `http://cdn.test/api/uploads/public/${key}`),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const config = { get: vi.fn().mockReturnValue(undefined) };
  const service = new BrandingService(
    repo as unknown as BrandingRepository,
    storage as unknown as StorageService,
    config as never,
  );

  return { service, repo, storage };
}

describe('BrandingService', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('getPublicConfig()', () => {
    it('should return the default app name and null logo when no settings exist', async () => {
      ctx.repo.find.mockResolvedValue(null);

      await expect(ctx.service.getPublicConfig()).resolves.toEqual({
        appName: 'Open Meet',
        logoUrl: null,
        gifsEnabled: false,
        accentColor: 'indigo',
        userCanCreateGroups: false,
      });
    });

    it('should resolve the public logo URL from the stored key', async () => {
      ctx.repo.find.mockResolvedValue({ appName: 'Acme', logoKey: 'branding/logo_abc.png' });

      await expect(ctx.service.getPublicConfig()).resolves.toEqual({
        appName: 'Acme',
        logoUrl: 'http://cdn.test/api/uploads/public/branding/logo_abc.png',
        gifsEnabled: false,
        accentColor: 'indigo',
        userCanCreateGroups: false,
      });
    });
  });

  describe('updateAppName()', () => {
    it('should trim and persist the new application name', async () => {
      ctx.repo.find.mockResolvedValue({ appName: 'Acme', logoKey: null });

      const result = await ctx.service.updateAppName('  Acme  ');

      expect(ctx.repo.setAppName).toHaveBeenCalledWith('Acme');
      expect(result.appName).toBe('Acme');
    });

    it('should reject a name that is empty after trimming', async () => {
      await expect(ctx.service.updateAppName('   ')).rejects.toBeInstanceOf(BadRequestException);
      expect(ctx.repo.setAppName).not.toHaveBeenCalled();
    });

    it('should reject a name longer than 60 characters', async () => {
      await expect(ctx.service.updateAppName('a'.repeat(61))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(ctx.repo.setAppName).not.toHaveBeenCalled();
    });
  });

  describe('setLogo()', () => {
    it('should reject an unsupported mime type without touching storage', async () => {
      await expect(
        ctx.service.setLogo({ buffer: Buffer.from('x'), mime: 'image/svg+xml' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ctx.storage.put).not.toHaveBeenCalled();
    });

    it('should reject an empty buffer', async () => {
      await expect(
        ctx.service.setLogo({ buffer: Buffer.alloc(0), mime: 'image/png' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject a logo larger than the 2MB limit', async () => {
      await expect(
        ctx.service.setLogo({ buffer: Buffer.alloc(2 * 1024 * 1024 + 1), mime: 'image/png' }),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it('should store the logo, persist its key, and delete the previous logo', async () => {
      ctx.repo.find
        .mockResolvedValueOnce({ appName: 'Acme', logoKey: 'branding/old.png' })
        .mockResolvedValueOnce({ appName: 'Acme', logoKey: 'branding/new.png' });

      await ctx.service.setLogo({ buffer: Buffer.from('png-bytes'), mime: 'image/png' });

      const putKey = ctx.storage.put.mock.calls[0]?.[0]?.key as string;
      expect(putKey).toMatch(/^branding\/logo_[0-9a-f]+\.png$/);
      expect(ctx.repo.setLogoKey).toHaveBeenCalledWith(putKey);
      expect(ctx.storage.delete).toHaveBeenCalledWith('branding/old.png');
    });

    it('should not delete anything when there was no previous logo', async () => {
      ctx.repo.find
        .mockResolvedValueOnce({ appName: 'Acme', logoKey: null })
        .mockResolvedValueOnce({ appName: 'Acme', logoKey: 'branding/new.png' });

      await ctx.service.setLogo({ buffer: Buffer.from('png-bytes'), mime: 'image/png' });

      expect(ctx.storage.delete).not.toHaveBeenCalled();
    });
  });

  describe('clearLogo()', () => {
    it('should clear the key and delete the stored file when a logo exists', async () => {
      ctx.repo.find
        .mockResolvedValueOnce({ appName: 'Acme', logoKey: 'branding/old.png' })
        .mockResolvedValueOnce({ appName: 'Acme', logoKey: null });

      await ctx.service.clearLogo();

      expect(ctx.repo.setLogoKey).toHaveBeenCalledWith(null);
      expect(ctx.storage.delete).toHaveBeenCalledWith('branding/old.png');
    });

    it('should be a no-op when there is no logo set', async () => {
      ctx.repo.find.mockResolvedValue({ appName: 'Acme', logoKey: null });

      await ctx.service.clearLogo();

      expect(ctx.repo.setLogoKey).not.toHaveBeenCalled();
      expect(ctx.storage.delete).not.toHaveBeenCalled();
    });
  });
});
