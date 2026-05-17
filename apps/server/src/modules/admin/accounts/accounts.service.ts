import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Admin, AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';

import type {
  AdminAccountDto,
  AdminAccountListResponseDto,
  AdminInviteAccountDto,
} from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { AdminRepository } from '../admin.repository';

@Injectable()
export class AdminAccountsService {
  constructor(private readonly admins: AdminRepository) {}

  async list(): Promise<AdminAccountListResponseDto> {
    const rows = await this.admins.list();
    return { items: rows.map((a) => this.toDto(a)) };
  }

  async invite(dto: AdminInviteAccountDto): Promise<AdminAccountDto> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Name is required',
      });
    }

    const existing = await this.admins.findByEmail(email);

    if (existing) {
      throw new ConflictException({
        code: ApiErrorCode.EMAIL_TAKEN,
        message: 'An admin with that email already exists',
      });
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const created = await this.admins.create({
      email,
      name,
      passwordHash,
      role: dto.role ?? AdminRole.ADMIN,
    });

    return this.toDto(created);
  }

  async delete(actingAdminId: string, targetId: string): Promise<{ deleted: true }> {
    if (actingAdminId === targetId) {
      throw new ForbiddenException({
        code: ApiErrorCode.MEETING_FORBIDDEN,
        message: 'You cannot delete your own admin account',
      });
    }

    const target = await this.admins.findById(targetId);

    if (!target) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Admin not found',
      });
    }

    if (target.role === AdminRole.SUPERADMIN) {
      const remaining = await this.admins.countByRole(AdminRole.SUPERADMIN);

      if (remaining <= 1) {
        throw new ForbiddenException({
          code: ApiErrorCode.MEETING_FORBIDDEN,
          message: 'Cannot delete the last remaining superadmin',
        });
      }
    }

    await this.admins.delete(targetId);
    return { deleted: true };
  }

  private toDto(admin: Admin): AdminAccountDto {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdAt: admin.createdAt.toISOString(),
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    };
  }
}
