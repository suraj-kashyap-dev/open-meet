import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import { AuthController } from '@/modules/client/auth/auth.controller';
import type { AuthService } from '@/modules/client/auth/auth.service';
import type { AvatarsService } from '@/modules/client/auth/avatars.service';
import type { GoogleOAuthService } from '@/modules/client/auth/google-oauth.service';

function makeController(isConfigured: boolean): AuthController {
  const google = { isConfigured: () => isConfigured } as unknown as GoogleOAuthService;

  return new AuthController(
    {} as unknown as AuthService,
    {} as unknown as AvatarsService,
    google,
    {} as unknown as ConfigService<ApiEnv, true>,
  );
}

describe('AuthController', () => {
  describe('googleStatus()', () => {
    it('should report enabled when the server has Google OAuth credentials', () => {
      expect(makeController(true).googleStatus()).toEqual({ enabled: true });
    });

    it('should report disabled when the server is not configured for Google OAuth', () => {
      expect(makeController(false).googleStatus()).toEqual({ enabled: false });
    });
  });
});
