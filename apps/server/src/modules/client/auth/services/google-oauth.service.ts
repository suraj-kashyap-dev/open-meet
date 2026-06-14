import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

import type { ApiEnv } from '@open-meet/config';
import { ApiErrorCode } from '@open-meet/types';

import { RedisService } from '@/integrations/redis/services/redis.service';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const SCOPES = ['openid', 'email', 'profile'];
const STATE_TTL_SECONDS = 600;

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  refresh_token?: string;
}

interface GoogleUserInfoResponse {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly redis: RedisService,
  ) {}

  isConfigured(): boolean {
    const clientId = this.config.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');

    return Boolean(clientId && clientSecret);
  }

  async buildAuthorizationUrl(): Promise<{ url: string; state: string }> {
    this.assertConfigured();

    const state = randomBytes(24).toString('hex');

    await this.redis.client.set(this.stateKey(state), '1', 'EX', STATE_TTL_SECONDS);

    const params = new URLSearchParams({
      client_id: this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_OAUTH_REDIRECT_URI'),
      response_type: 'code',
      scope: SCOPES.join(' '),
      state,
      access_type: 'online',
      prompt: 'select_account',
      include_granted_scopes: 'true',
    });

    return { url: `${AUTH_ENDPOINT}?${params.toString()}`, state };
  }

  async consumeState(state: string | undefined): Promise<void> {
    if (!state || typeof state !== 'string') {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Missing OAuth state',
      });
    }

    const key = this.stateKey(state);
    const deleted = await this.redis.client.del(key);

    if (deleted === 0) {
      throw new UnauthorizedException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'OAuth state is invalid or has expired',
      });
    }
  }

  async exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
    this.assertConfigured();

    if (!code || typeof code !== 'string') {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Missing authorization code',
      });
    }

    const tokenResponse = await this.requestToken(code);

    if (!tokenResponse.access_token) {
      throw new ServiceUnavailableException({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: 'Google did not return an access token',
      });
    }

    const userInfo = await this.fetchUserInfo(tokenResponse.access_token);

    if (!userInfo.sub || !userInfo.email) {
      throw new ServiceUnavailableException({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: 'Google user profile is missing required fields',
      });
    }

    if (userInfo.email_verified === false) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Google account email is not verified',
      });
    }

    const displayName =
      userInfo.name?.trim() ||
      [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ').trim() ||
      userInfo.email.split('@')[0] ||
      'New user';

    return {
      sub: userInfo.sub,
      email: userInfo.email.toLowerCase(),
      emailVerified: true,
      name: displayName,
      picture: userInfo.picture ?? null,
    };
  }

  private async requestToken(code: string): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: this.config.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET'),
      redirect_uri: this.config.getOrThrow<string>('GOOGLE_OAUTH_REDIRECT_URI'),
      grant_type: 'authorization_code',
    });

    let response: Response;

    try {
      response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (err) {
      this.logger.error(`Google token endpoint unreachable: ${(err as Error).message}`);
      throw new ServiceUnavailableException({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: 'Could not reach Google authentication service',
      });
    }

    if (!response.ok) {
      const text = await safeText(response);

      this.logger.warn(`Google token exchange failed (${response.status}): ${text}`);
      throw new UnauthorizedException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'Failed to exchange authorization code with Google',
      });
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfoResponse> {
    let response: Response;

    try {
      response = await fetch(USERINFO_ENDPOINT, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      this.logger.error(`Google userinfo endpoint unreachable: ${(err as Error).message}`);
      throw new ServiceUnavailableException({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: 'Could not fetch Google user profile',
      });
    }

    if (!response.ok) {
      const text = await safeText(response);

      this.logger.warn(`Google userinfo fetch failed (${response.status}): ${text}`);
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Could not fetch Google user profile',
      });
    }

    return (await response.json()) as GoogleUserInfoResponse;
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: 'Google sign-in is not configured on this server',
      });
    }
  }

  private stateKey(state: string): string {
    return `auth:oauth:google:state:${state}`;
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
