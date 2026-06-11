import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserInvite } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

import type { UserDto, UserInviteLookupDto, UserMeResponseDto } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';
import type { ApiEnv } from '@open-meet/config';

import { RedisService } from '../../../../integrations/redis/services/redis.service';
import { PresenceService } from '../../messaging/services/presence.service';
import { AuthRepository } from '../repositories/auth.repository';
import { AvatarsService } from './avatars.service';
import type { AcceptUserInviteDto } from '../dto/accept-user-invite.dto';
import type { LoginDto } from '../dto/login.dto';
import type { UpdateProfileDto } from '../dto/update-profile.dto';
import type { ChangePasswordDto } from '../dto/change-password.dto';
import { UserInviteRepository } from '../repositories/user-invite.repository';

interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  guest?: boolean;
  guestMeetingCode?: string;
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

export interface GuestAccessToken {
  accessToken: string;
  expiresAt: string;
  accessTtlMs: number;
}

@Injectable()
export class AuthService {
  private readonly refreshTtlSeconds = 60 * 60 * 24 * 7;
  private readonly guestAccessTtlMs = 12 * 60 * 60 * 1000;

  constructor(
    private readonly users: AuthRepository,
    private readonly avatars: AvatarsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly redis: RedisService,
    private readonly userInvites: UserInviteRepository,
    private readonly presence: PresenceService,
  ) {}

  async lookupUserInvite(token: string): Promise<UserInviteLookupDto> {
    const invite = await this.requireValidUserInvite(token);

    return {
      email: invite.email,
      name: invite.name,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async acceptUserInvite(
    dto: AcceptUserInviteDto,
  ): Promise<{ user: UserDto; tokens: IssuedTokens }> {
    const invite = await this.requireValidUserInvite(dto.token);

    const existing = await this.users.findByEmail(invite.email);

    if (existing) {
      await this.userInvites.delete(invite.id);
      throw new ConflictException({
        code: ApiErrorCode.EMAIL_TAKEN,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.users.createInvited({
      name: invite.name,
      email: invite.email,
      passwordHash,
      timezone: dto.timezone?.trim() || undefined,
      language: dto.language?.trim() || undefined,
      bio: dto.bio?.trim() || null,
    });

    await this.userInvites.delete(invite.id);

    await this.presence.resetStatus(user.id);
    const tokens = await this.issueTokens(user.id, user.email, user.name);

    return { user: this.avatars.toUserDto(user), tokens };
  }

  private async requireValidUserInvite(token: string): Promise<UserInvite> {
    const invite = await this.userInvites.findByTokenHash(this.hashToken(token));

    if (!invite) {
      throw new NotFoundException({
        code: ApiErrorCode.INVITE_INVALID,
        message: 'This invitation link is invalid.',
      });
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: ApiErrorCode.INVITE_EXPIRED,
        message: 'This invitation has expired.',
      });
    }

    return invite;
  }

  async login(dto: LoginDto): Promise<{ user: UserDto; tokens: IssuedTokens }> {
    const user = await this.users.findByEmail(dto.email);

    if (!user) {
      throw this.invalidCredentials();
    }

    if (!user.passwordHash) {
      throw this.invalidCredentials();
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);

    if (!valid) {
      throw this.invalidCredentials();
    }

    await this.presence.resetStatus(user.id);
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
        throw new ForbiddenException({
          code: ApiErrorCode.FORBIDDEN,
          message: 'No account exists for this Google address. Ask an admin for an invite.',
        });
      }
    } else if (profile.picture && !user.avatarKey && user.avatarUrl !== profile.picture) {
      user = await this.users.update(user.id, { avatarUrl: profile.picture });
    }

    await this.presence.resetStatus(user.id);
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

  async logout(refreshToken: string | undefined, userId?: string): Promise<void> {
    let presenceTarget: string | undefined = userId;

    if (refreshToken) {
      try {
        const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        });

        await this.redis.client.del(this.refreshKey(payload.sub, payload.jti));

        presenceTarget = presenceTarget ?? payload.sub;
      } catch {}
    }

    if (presenceTarget) {
      try {
        const disconnectedSockets = await this.presence.disconnectSockets(presenceTarget);

        if (disconnectedSockets === 0) {
          await this.presence.forceOffline(presenceTarget);
        }
      } catch {}

      try {
        await this.presence.resetStatus(presenceTarget);
      } catch {}
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

  async getMe(id: string): Promise<UserMeResponseDto> {
    const user = await this.users.findById(id);

    if (!user) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'User not found',
      });
    }

    return {
      user: this.avatars.toUserDto(user),
      canCreateGroups: user.canCreateGroups,
    };
  }

  async issueGuestAccessToken(input: {
    userId: string;
    email: string;
    name: string;
    meetingCode: string;
  }): Promise<GuestAccessToken> {
    const accessPayload: AccessTokenPayload = {
      sub: input.userId,
      email: input.email,
      name: input.name,
      guest: true,
      guestMeetingCode: input.meetingCode,
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: Math.floor(this.guestAccessTtlMs / 1000),
    });

    return {
      accessToken,
      accessTtlMs: this.guestAccessTtlMs,
      expiresAt: new Date(Date.now() + this.guestAccessTtlMs).toISOString(),
    };
  }

  async getPublicProfile(
    viewerId: string,
    targetId: string,
    haveSharedSurface: () => Promise<boolean>,
  ): Promise<import('@open-meet/types').PublicUserDto> {
    const row = await this.users.findByIdWithSettings(targetId);

    if (!row) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'User not found.',
      });
    }

    const visibility = row.settings?.profileVisibility ?? 'PARTICIPANTS_ONLY';
    const isSelf = viewerId === targetId;
    const sharedSurface = isSelf || (await haveSharedSurface());
    const showFull =
      isSelf || visibility === 'PUBLIC' || (visibility === 'PARTICIPANTS_ONLY' && sharedSurface);
    const avatar = this.avatars.resolveUrl(row.avatarKey) ?? row.avatarUrl ?? null;

    if (!showFull) {
      return {
        id: row.id,
        name: row.name,
        avatar,
        bio: null,
        timezone: null,
        language: null,
        email: null,
        joinedAt: null,
        visibility,
      };
    }

    const showEmail =
      visibility === 'PUBLIC' || (showFull && (row.settings?.showEmailToParticipants ?? true));

    return {
      id: row.id,
      name: row.name,
      avatar,
      bio: row.bio,
      timezone: row.timezone,
      language: row.language,
      email: showEmail ? row.email : null,
      joinedAt: row.createdAt.toISOString(),
      visibility,
    };
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
      if (keys.length) {
        await this.redis.client.del(keys);
      }
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

    if (!match || !match[1] || !match[2]) {
      return 0;
    }

    const n = parseInt(match[1], 10);
    const unit = match[2];
    const mult: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

    return n * (mult[unit] ?? 0);
  }
}
