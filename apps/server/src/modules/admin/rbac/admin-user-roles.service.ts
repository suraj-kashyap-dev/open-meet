import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserRoleRecord } from '@prisma/client';
import { I18nContext } from 'nestjs-i18n';

import {
  ApiErrorCode,
  PERMISSION_TREE_USER,
  PermissionType,
  type RoleDto,
  type RoleListResponseDto,
  expandToLeaves,
} from '@open-meet/types';

import { UserPermissionResolver } from '../../client/rbac/user-permission-resolver.service';
import { UserRoleRepository } from '../../client/rbac/user-role.repository';

import type { CreateRoleBodyDto, UpdateRoleBodyDto } from './dto/role.dto';

@Injectable()
export class AdminUserRolesService {
  constructor(
    private readonly roles: UserRoleRepository,
    private readonly resolver: UserPermissionResolver,
  ) {}

  async list(): Promise<RoleListResponseDto> {
    const records = await this.roles.list();
    return { items: records.map((r) => this.toDto(r, r._count.users)) };
  }

  async get(id: string): Promise<RoleDto> {
    const record = await this.roles.findWithMemberCount(id);
    if (!record) throw this.notFound();
    return this.toDto(record, record._count.users);
  }

  async create(dto: CreateRoleBodyDto): Promise<RoleDto> {
    const name = dto.name.trim();
    if (!name) throw this.badRequest('name-empty', 'Name cannot be empty');

    const existing = await this.roles.findByName(name);
    if (existing) throw this.nameTaken();

    const permissionType = dto.permissionType ?? PermissionType.CUSTOM;
    const permissions =
      permissionType === PermissionType.ALL ? [] : this.normalizePermissions(dto.permissions ?? []);

    const created = await this.roles.create({
      name,
      description: dto.description ?? null,
      permissionType,
      permissions,
    });
    return this.toDto(created, 0);
  }

  async update(id: string, dto: UpdateRoleBodyDto): Promise<RoleDto> {
    const existing = await this.roles.findWithMemberCount(id);
    if (!existing) throw this.notFound();
    if (existing.isSystem) {
      // Only `description` and `permissions` may change on system user roles.
      if (dto.name !== undefined || dto.permissionType !== undefined) throw this.systemLocked();
    }

    const data: Parameters<UserRoleRepository['update']>[1] = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw this.badRequest('name-empty', 'Name cannot be empty');
      if (name !== existing.name) {
        const clash = await this.roles.findByName(name);
        if (clash && clash.id !== id) throw this.nameTaken();
        data.name = name;
      }
    }
    if (dto.description !== undefined) data.description = dto.description;
    const nextType = dto.permissionType ?? existing.permissionType;
    if (dto.permissionType !== undefined) data.permissionType = dto.permissionType;
    if (dto.permissions !== undefined || dto.permissionType !== undefined) {
      data.permissions =
        nextType === PermissionType.ALL
          ? []
          : this.normalizePermissions(dto.permissions ?? existing.permissions);
    }

    const updated = await this.roles.update(id, data);
    this.resolver.invalidate(id);
    return this.toDto(updated, existing._count.users);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.roles.findWithMemberCount(id);
    if (!existing) throw this.notFound();
    if (existing.isSystem) throw this.systemLocked();
    if (existing._count.users > 0) {
      throw new ConflictException({
        code: ApiErrorCode.ROLE_HAS_MEMBERS,
        message:
          I18nContext.current()?.t('errors.role-has-members') ??
          'Reassign every user in this role before deleting it',
        details: { userCount: existing._count.users },
      });
    }
    await this.roles.delete(id);
    this.resolver.invalidate(id);
  }

  /**
   * Expand parents into leaves and PRUNE anything that is not a current catalog
   * key (e.g. the retired `teams.channels.*`), so legacy roles stay editable and
   * self-heal on save rather than being rejected.
   */
  private normalizePermissions(selected: readonly string[]): string[] {
    return expandToLeaves(selected, PERMISSION_TREE_USER);
  }

  private toDto(r: UserRoleRecord, memberCount: number): RoleDto {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      permissionType: r.permissionType,
      permissions: [...r.permissions].sort(),
      isSystem: r.isSystem,
      memberCount,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      code: ApiErrorCode.ROLE_NOT_FOUND,
      message: I18nContext.current()?.t('errors.role-not-found') ?? 'Role not found',
    });
  }

  private nameTaken(): ConflictException {
    return new ConflictException({
      code: ApiErrorCode.ROLE_NAME_TAKEN,
      message:
        I18nContext.current()?.t('errors.role-name-taken') ??
        'A role with that name already exists',
    });
  }

  private systemLocked(): ForbiddenException {
    return new ForbiddenException({
      code: ApiErrorCode.ROLE_IS_SYSTEM,
      message:
        I18nContext.current()?.t('errors.role-is-system') ??
        'System roles cannot be modified or deleted',
    });
  }

  private badRequest(key: string, fallback: string): BadRequestException {
    return new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: I18nContext.current()?.t(`errors.${key}`) ?? fallback,
    });
  }
}
