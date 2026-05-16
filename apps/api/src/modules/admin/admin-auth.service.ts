import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import type { AdminDto } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';
import type { ApiEnv } from '@open-meet/config';

import { AdminRepository } from './admin.repository';
import type { AdminLoginDto } from './dto/admin-login.dto';

interface AdminAccessPayload {
  sub: string;
  email: string;
  role: string;
}

export interface IssuedAdminTokens {
  accessToken: string;
  accessTtlMs: number;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly admins: AdminRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  async login(
    dto: AdminLoginDto,
  ): Promise<{ admin: AdminDto; tokens: IssuedAdminTokens }> {
    const admin = await this.admins.findByEmail(dto.email);

    if (! admin) {
      throw this.invalidCredentials();
    }

    const valid = await argon2.verify(admin.passwordHash, dto.password);

    if (! valid) {
      throw this.invalidCredentials();
    }

    await this.admins.touchLastLogin(admin.id);
    const tokens = await this.issueTokens(admin.id, admin.email, admin.role);
    return { admin: this.toDto({ ...admin, lastLoginAt: new Date() }), tokens };
  }

  async getAdminDtoById(id: string): Promise<AdminDto> {
    const admin = await this.admins.findById(id);

    if (! admin) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Admin not found',
      });
    }

    return this.toDto(admin);
  }

  private async issueTokens(
    adminId: string,
    email: string,
    role: string,
  ): Promise<IssuedAdminTokens> {
    const accessTtl = this.config.getOrThrow<string>('ADMIN_JWT_ACCESS_EXPIRY');
    const accessTtlMs = this.parseTtlMs(accessTtl);
    const payload: AdminAccessPayload = { sub: adminId, email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('ADMIN_JWT_ACCESS_SECRET'),
      expiresIn: Math.floor(accessTtlMs / 1000),
    });
    return { accessToken, accessTtlMs };
  }

  private toDto(a: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  }): AdminDto {
    return {
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role as AdminDto['role'],
      createdAt: a.createdAt.toISOString(),
      lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
    };
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: ApiErrorCode.INVALID_CREDENTIALS,
      message: 'Invalid email or password',
    });
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);

    if (! match || ! match[1] || ! match[2]) {
      return 0;
    }

    const n = parseInt(match[1], 10);
    const unit = match[2];
    const mult: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return n * (mult[unit] ?? 0);
  }
}
