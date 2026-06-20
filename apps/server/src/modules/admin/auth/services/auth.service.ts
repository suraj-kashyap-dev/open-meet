import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AdminRoleRecord } from '@prisma/client';
import * as argon2 from 'argon2';

import type {
  AdminChangePasswordDto,
  AdminDto,
  AdminMeResponseDto,
  AdminUpdateProfileDto,
} from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';
import type { ApiEnv } from '@open-meet/config';

import { StorageService } from '../../../../storage/services/storage.service';

import { AdminRepository } from '../../core/repositories/admin.repository';
import { AdminRoleRepository } from '../../rbac/repositories/admin-role.repository';
import type { AdminLoginDto } from '../dto/admin-login.dto';

interface AdminAccessPayload {
  sub: string;
  email: string;
  roleId: string | null;
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
    private readonly storage: StorageService,
    private readonly roles: AdminRoleRepository,
  ) {}

  async login(dto: AdminLoginDto): Promise<{ admin: AdminDto; tokens: IssuedAdminTokens }> {
    const admin = await this.admins.findByEmail(dto.email);

    if (!admin) {
      throw this.invalidCredentials();
    }

    const valid = await argon2.verify(admin.passwordHash, dto.password);

    if (!valid) {
      throw this.invalidCredentials();
    }

    await this.admins.touchLastLogin(admin.id);
    const tokens = await this.issueTokens(admin.id, admin.email, admin.roleRecordId);
    const role = admin.roleRecordId ? await this.roles.findById(admin.roleRecordId) : null;

    return { admin: this.toDto({ ...admin, lastLoginAt: new Date() }, role), tokens };
  }

  async getAdminDtoById(id: string): Promise<AdminDto> {
    const admin = await this.admins.findById(id);

    if (!admin) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Admin not found',
      });
    }

    const role = admin.roleRecordId ? await this.roles.findById(admin.roleRecordId) : null;

    return this.toDto(admin, role);
  }

  async getMe(id: string): Promise<AdminMeResponseDto> {
    const admin = await this.admins.findById(id);

    if (!admin) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Admin not found',
      });
    }

    const role = admin.roleRecordId ? await this.roles.findById(admin.roleRecordId) : null;

    return {
      admin: this.toDto(admin, role),
      role: role ? { id: role.id, name: role.name, permissionType: role.permissionType } : null,
      grantedSet: role ? [...role.permissions].sort() : [],
    };
  }

  async updateProfile(id: string, dto: AdminUpdateProfileDto): Promise<AdminDto> {
    const data: { name?: string } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (!name) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Name cannot be empty',
        });
      }

      data.name = name;
    }

    if (Object.keys(data).length === 0) {
      return this.getAdminDtoById(id);
    }

    const updated = await this.admins.update(id, data);
    const role = updated.roleRecordId ? await this.roles.findById(updated.roleRecordId) : null;

    return this.toDto(updated, role);
  }

  async changePassword(id: string, dto: AdminChangePasswordDto): Promise<void> {
    const admin = await this.admins.findById(id);

    if (!admin) {
      throw new UnauthorizedException({
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Admin not found',
      });
    }

    const valid = await argon2.verify(admin.passwordHash, dto.currentPassword);

    if (!valid) {
      throw new BadRequestException({
        code: ApiErrorCode.INVALID_CREDENTIALS,
        message: 'Current password is incorrect',
      });
    }

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });

    await this.admins.update(id, { passwordHash });
  }

  private async issueTokens(
    adminId: string,
    email: string,
    roleId: string | null,
  ): Promise<IssuedAdminTokens> {
    const accessTtl = this.config.getOrThrow<string>('ADMIN_JWT_ACCESS_EXPIRY');
    const accessTtlMs = this.parseTtlMs(accessTtl);
    const payload: AdminAccessPayload = { sub: adminId, email, roleId };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('ADMIN_JWT_ACCESS_SECRET'),
      expiresIn: Math.floor(accessTtlMs / 1000),
    });

    return { accessToken, accessTtlMs };
  }

  private toDto(
    a: {
      id: string;
      email: string;
      name: string;
      avatarKey: string | null;
      createdAt: Date;
      lastLoginAt: Date | null;
    },
    role: AdminRoleRecord | null,
  ): AdminDto {
    return {
      id: a.id,
      email: a.email,
      name: a.name,
      role: role ? { id: role.id, name: role.name, permissionType: role.permissionType } : null,
      avatar: a.avatarKey ? this.storage.publicUrl(a.avatarKey) : null,
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

    if (!match || !match[1] || !match[2]) {
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
