import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';

import type {
  AdminUserDto,
  AdminUserListQuery,
  AdminUserListResponseDto,
  AdminUpdateUserDto,
} from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { AdminUsersRepository, type UserWithCounts } from './users.repository';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class AdminUsersService {
  constructor(private readonly users: AdminUsersRepository) {}

  async list(query: AdminUserListQuery): Promise<AdminUserListResponseDto> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
    const search = query.search?.trim() || undefined;

    const [rows, total] = await Promise.all([
      this.users.list({ skip: (page - 1) * pageSize, take: pageSize, search }),
      this.users.count(search),
    ]);

    return {
      items: rows.map((u) => this.toDto(u)),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<AdminUserDto> {
    const user = await this.users.findById(id);

    if (! user) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: `User "${id}" not found`,
      });
    }

    return this.toDto(user);
  }

  async update(id: string, dto: AdminUpdateUserDto): Promise<AdminUserDto> {
    const existing = await this.users.findById(id);

    if (! existing) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: `User "${id}" not found`,
      });
    }

    if (dto.email) {
      const clash = await this.users.emailTakenByOther(dto.email, id);

      if (clash) {
        throw new ConflictException({
          code: ApiErrorCode.EMAIL_TAKEN,
          message: 'Another account already uses this email',
        });
      }
    }

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      data.email = dto.email.toLowerCase();
    }

    if (dto.avatar !== undefined) {
      const trimmed = dto.avatar?.trim();
      data.avatar = trimmed && trimmed.length > 0 ? trimmed : null;
    }

    if (dto.timezone !== undefined) {
      data.timezone = dto.timezone.trim() || 'UTC';
    }

    if (dto.language !== undefined) {
      data.language = dto.language.trim() || 'en';
    }

    if (dto.bio !== undefined) {
      const trimmed = dto.bio?.trim();
      data.bio = trimmed && trimmed.length > 0 ? trimmed : null;
    }

    if (dto.newPassword !== undefined && dto.newPassword.length > 0) {
      data.passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    }

    const updated = await this.users.update(id, data);
    return this.toDto(updated);
  }

  async delete(id: string): Promise<{ deleted: true }> {
    const existing = await this.users.findById(id);

    if (! existing) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: `User "${id}" not found`,
      });
    }

    await this.users.delete(id);
    return { deleted: true };
  }

  private toDto(u: UserWithCounts): AdminUserDto {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      timezone: u.timezone,
      language: u.language,
      bio: u.bio,
      createdAt: u.createdAt.toISOString(),
      meetingsHosted: u._count.hostedMeetings,
      meetingsAttended: u._count.meetings,
    };
  }
}
