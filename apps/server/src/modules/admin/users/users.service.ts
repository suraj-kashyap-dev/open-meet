import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

import { type Prisma } from '@prisma/client';

import type {
  AdminCreateUserDto,
  AdminUserDto,
  AdminUserListQuery,
  AdminUserListResponseDto,
  AdminUpdateUserDto,
  DatagridResponseDto,
} from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { DatagridService, buildOrderBy, paginate } from '../../../common/datagrid';
import { StorageService } from '../../../storage/storage.service';
import { AdminUsersRepository, type UserWithCounts } from './users.repository';
import { AdminUsersDatagridQueryDto } from './dto/users-datagrid-query.dto';
import { USERS_DATAGRID } from './users.datagrid';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const ALLOWED_AVATAR_MIMES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    private readonly users: AdminUsersRepository,
    private readonly storage: StorageService,
    private readonly grid: DatagridService,
  ) {}

  async datagrid(query: AdminUsersDatagridQueryDto): Promise<DatagridResponseDto<AdminUserDto>> {
    const { skip, take } = paginate(query);
    const search = query.search?.trim() || undefined;
    const where = this.users.searchWhere(search);
    const orderBy = buildOrderBy(USERS_DATAGRID, query) as Prisma.UserOrderByWithRelationInput;

    const [rows, total] = await Promise.all([
      this.users.listWith({ skip, take, where, orderBy }),
      this.users.countWith(where),
    ]);

    return this.grid.build(USERS_DATAGRID, {
      rows: rows.map((u) => this.toDto(u)),
      total,
      query,
    });
  }

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

  async create(dto: AdminCreateUserDto): Promise<AdminUserDto> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Name is required',
      });
    }

    const clash = await this.users.emailTaken(email);

    if (clash) {
      throw new ConflictException({
        code: ApiErrorCode.EMAIL_TAKEN,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const created = await this.users.create({
      name,
      email,
      passwordHash,
      timezone: dto.timezone?.trim() || undefined,
      language: dto.language?.trim() || undefined,
      bio: dto.bio?.trim() || null,
      canCreateGroups: dto.canCreateGroups,
    });

    return this.toDto(created);
  }

  async getById(id: string): Promise<AdminUserDto> {
    const user = await this.users.findById(id);

    if (!user) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: `User "${id}" not found`,
      });
    }

    return this.toDto(user);
  }

  async update(id: string, dto: AdminUpdateUserDto): Promise<AdminUserDto> {
    const existing = await this.users.findById(id);

    if (!existing) {
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

    if (dto.chatDisabled !== undefined) {
      data.chatDisabled = dto.chatDisabled;
    }

    if (dto.canCreateGroups !== undefined) {
      data.canCreateGroups = dto.canCreateGroups;
    }

    const updated = await this.users.update(id, data);
    return this.toDto(updated);
  }

  async delete(id: string): Promise<{ deleted: true }> {
    const existing = await this.users.findById(id);

    if (!existing) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: `User "${id}" not found`,
      });
    }

    await this.users.delete(id);
    return { deleted: true };
  }

  async uploadAvatar(id: string, buffer: Buffer, mime: string): Promise<AdminUserDto> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Avatar file is empty',
      });
    }

    if (buffer.length > MAX_AVATAR_BYTES) {
      throw new PayloadTooLargeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Avatar exceeds maximum size of ${MAX_AVATAR_BYTES} bytes`,
      });
    }

    const ext = ALLOWED_AVATAR_MIMES[mime];

    if (!ext) {
      throw new UnsupportedMediaTypeException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: `Avatar must be a PNG, JPEG, WebP, or GIF image (got ${mime})`,
      });
    }

    const existing = await this.users.findById(id);

    if (!existing) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: `User "${id}" not found`,
      });
    }

    const key = `avatars/${id}/${randomBytes(12).toString('hex')}.${ext}`;

    await this.storage.put({ key, buffer, mime });

    const updated = await this.users.update(id, { avatarKey: key });

    if (existing.avatarKey && existing.avatarKey !== key) {
      this.storage.delete(existing.avatarKey).catch((err: unknown) => {
        this.logger.warn(
          `Failed to delete previous avatar "${existing.avatarKey}": ${(err as Error).message}`,
        );
      });
    }

    return this.toDto(updated);
  }

  async removeAvatar(id: string): Promise<AdminUserDto> {
    const existing = await this.users.findById(id);

    if (!existing) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: `User "${id}" not found`,
      });
    }

    if (!existing.avatarKey) {
      return this.toDto(existing);
    }

    const previousKey = existing.avatarKey;

    const updated = await this.users.update(id, { avatarKey: null });

    this.storage.delete(previousKey).catch((err: unknown) => {
      this.logger.warn(`Failed to delete avatar "${previousKey}": ${(err as Error).message}`);
    });

    return this.toDto(updated);
  }

  private toDto(u: UserWithCounts): AdminUserDto {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatarKey ? this.storage.publicUrl(u.avatarKey) : null,
      timezone: u.timezone,
      language: u.language,
      bio: u.bio,
      chatDisabled: u.chatDisabled,
      canCreateGroups: u.canCreateGroups,
      createdAt: u.createdAt.toISOString(),
      meetingsHosted: u._count.hostedMeetings,
      meetingsAttended: u._count.meetings,
    };
  }
}
