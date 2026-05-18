import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

import type { UserDto } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';
import type { ApiEnv } from '@open-meet/config';

import { RedisService } from '../../../integrations/redis/redis.service';
import { AuthRepository } from './auth.repository';
import { AvatarsService } from './avatars.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';

interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTtlMs: number;
  accessTtlMs: number;
}

@Injectable()
export class AuthService {
  private readonly refreshTtlSeconds = 60 * 60 * 24 * 7; // 7d in seconds

  constructor(
    private readonly users: AuthRepository,
    private readonly avatars: AvatarsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly redis: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: UserDto; tokens: IssuedTokens }> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        code: ApiErrorCode.EMAIL_TAKEN,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: this.avatars.toUserDto(user), tokens };
  }

  async login(dto: LoginDto): Promise<{ user: UserDto; tokens: IssuedTokens }> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw this.invalidCredentials();

    if (!user.passwordHash) throw this.invalidCredentials();

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw this.invalidCredentials();

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: this.avatars.toUserDto(user), tokens };
  }

  async loginWithGoogle(profile: {
    sub: string;
    email: string;
    name: string;
    picture: string | null;
  }): Promise<{ user: UserDto; tokens: IssuedTokens }> {
    let user = await this.users.findByGoogleId(profile.sub);

    if (!user) {
      const byEmail = await this.users.findByEmail(profile.email);

      if (byEmail) {
        user = await this.users.update(byEmail.id, {
          googleId: profile.sub,
          avatarUrl: byEmail.avatarUrl ?? profile.picture,
        });
      } else {
        user = await this.users.createGoogleUser({
          name: profile.name,
          email: profile.email,
          googleId: profile.sub,
          avatarUrl: profile.picture,
        });
      }
    } else if (profile.picture && !user.avatarKey && user.avatarUrl !== profile.picture) {
      user = await this.users.update(user.id, { avatarUrl: profile.picture });
    }

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: this.avatars.toUserDto(user), tokens };
  }

  async refresh(refreshToken: string): Promise<IssuedTokens> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'Refresh token is invalid or expired',
      });
    }

    const key = this.refreshKey(payload.sub, payload.jti);
    const stored = await this.redis.client.get(key);
    if (!stored) {
      throw new UnauthorizedException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'Refresh token has been revoked',
      });
    }

    if (stored !== this.hashToken(refreshToken)) {
      // token reuse — invalidate everything for this user (best-effort)
      await this.revokeAllForUser(payload.sub);
      throw new UnauthorizedException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: 'Refresh token reuse detected',
      });
    }

    await this.redis.client.del(key);

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'User no longer exists',
      });
    }

    return this.issueTokens(user.id, user.email, user.name);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      await this.redis.client.del(this.refreshKey(payload.sub, payload.jti));
    } catch {
      // Silent: logout should be best-effort
    }
  }

  async getUserDtoById(id: string): Promise<UserDto> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'User not found',
      });
    }
    return this.avatars.toUserDto(user);
  }

  async updateProfile(id: string, input: UpdateProfileDto): Promise<UserDto> {
    const existing = await this.users.findById(id);

    if (!existing) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'User not found',
      });
    }

    const data: Record<string, unknown> = {};

    const trimmedName = input.name?.trim();

    if (trimmedName && trimmedName.length > 0) {
      data.name = trimmedName;
    }

    if (input.timezone !== undefined) {
      data.timezone = input.timezone.trim() || 'UTC';
    }

    if (input.language !== undefined) {
      data.language = input.language.trim() || 'en';
    }

    if (input.bio !== undefined) {
      const trimmed = input.bio?.trim();
      data.bio = trimmed && trimmed.length > 0 ? trimmed : null;
    }

    const updated = await this.users.update(id, data);

    return this.avatars.toUserDto(updated);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<{ changed: true }> {
    const user = await this.users.findById(id);

    if (!user) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'User not found',
      });
    }

    if (!user.passwordHash) {
      throw new BadRequestException({
        code: ApiErrorCode.INVALID_CREDENTIALS,
        message: 'This account does not have a password. Sign in with Google instead.',
      });
    }

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);

    if (!valid) {
      throw new BadRequestException({
        code: ApiErrorCode.INVALID_CREDENTIALS,
        message: 'Current password is incorrect',
      });
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'New password must differ from the current one',
      });
    }

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });

    await this.users.update(id, { passwordHash });

    await this.revokeAllForUser(id);

    return { changed: true };
  }

  private async issueTokens(userId: string, email: string, name: string): Promise<IssuedTokens> {
    const accessTtl = this.config.getOrThrow<string>('JWT_ACCESS_EXPIRY');
    const refreshTtl = this.config.getOrThrow<string>('JWT_REFRESH_EXPIRY');
    const accessTtlMs = this.parseTtlMs(accessTtl);
    const refreshTtlMs = this.parseTtlMs(refreshTtl);

    const accessPayload: AccessTokenPayload = { sub: userId, email, name };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: Math.floor(accessTtlMs / 1000),
    });

    const jti = randomBytes(16).toString('hex');
    const refreshPayload: RefreshTokenPayload = { sub: userId, jti };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: Math.floor(refreshTtlMs / 1000),
    });

    await this.redis.client.set(
      this.refreshKey(userId, jti),
      this.hashToken(refreshToken),
      'EX',
      this.refreshTtlSeconds,
    );

    return {
      accessToken,
      refreshToken,
      accessTtlMs,
      refreshTtlMs,
    };
  }

  private refreshKey(userId: string, jti: string): string {
    return `auth:refresh:${userId}:${jti}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    const stream = this.redis.client.scanStream({ match: `auth:refresh:${userId}:*` });
    for await (const keys of stream) {
      if (keys.length) await this.redis.client.del(keys);
    }
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: ApiErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid email or password',
    });
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match || !match[1] || !match[2]) return 0;
    const n = parseInt(match[1], 10);
    const unit = match[2];
    const mult: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return n * (mult[unit] ?? 0);
  }
}
