import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AdminRoleRecord, Prisma } from '@prisma/client';
import { I18nContext } from 'nestjs-i18n';

import {
  ApiErrorCode,
  PERMISSION_TREE_ADMIN,
  PermissionType,
  type DatagridResponseDto,
  type RoleDto,
  type RoleListResponseDto,
  expandToLeaves,
} from '@open-meet/types';

import { DatagridService, buildOrderBy, paginate } from '../../../common/datagrid';
import { AdminPermissionResolver } from './admin-permission-resolver.service';
import { AdminRoleRepository } from './admin-role.repository';
import type { CreateRoleBodyDto, UpdateRoleBodyDto } from './dto/role.dto';
import { AdminRolesDatagridQueryDto } from './dto/roles-datagrid-query.dto';
import { ROLES_DATAGRID } from './roles.datagrid';

const SELF_LOCKOUT_GUARDED_KEYS = ['roles.view', 'roles.update', 'admin-accounts.update'] as const;

@Injectable()
export class AdminRolesService {
  constructor(
    private readonly roles: AdminRoleRepository,
    private readonly resolver: AdminPermissionResolver,
    private readonly grid: DatagridService,
  ) {}

  async datagrid(query: AdminRolesDatagridQueryDto): Promise<DatagridResponseDto<RoleDto>> {
    const { skip, take } = paginate(query);
    const search = query.search?.trim() || undefined;
    const where = this.roles.searchWhere(search);
    const orderBy = buildOrderBy(
      ROLES_DATAGRID,
      query,
    ) as Prisma.AdminRoleRecordOrderByWithRelationInput;

    const [rows, total] = await Promise.all([
      this.roles.listWith({ skip, take, where, orderBy }),
      this.roles.countWith(where),
    ]);

    return this.grid.build(ROLES_DATAGRID, {
      rows: rows.map((r) => this.toDto(r, r._count.admins)),
      total,
      query,
    });
  }

  async list(): Promise<RoleListResponseDto> {
    const records = await this.roles.list();
    return { items: records.map((r) => this.toDto(r, r._count.admins)) };
  }

  async get(id: string): Promise<RoleDto> {
    const record = await this.roles.findWithMemberCount(id);
    if (!record) throw this.notFound();
    return this.toDto(record, record._count.admins);
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

  async update(
    id: string,
    dto: UpdateRoleBodyDto,
    currentAdminRoleId: string | null,
  ): Promise<RoleDto> {
    const existing = await this.roles.findWithMemberCount(id);
    if (!existing) throw this.notFound();
    if (existing.isSystem) throw this.systemLocked();

    const data: Parameters<AdminRoleRepository['update']>[1] = {};
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
    const nextPerms =
      dto.permissions !== undefined || dto.permissionType !== undefined
        ? nextType === PermissionType.ALL
          ? []
          : this.normalizePermissions(dto.permissions ?? existing.permissions)
        : undefined;
    if (nextPerms !== undefined) data.permissions = nextPerms;

    if (currentAdminRoleId === id && nextType === PermissionType.CUSTOM) {
      const effective = nextPerms ?? existing.permissions;
      const missing = SELF_LOCKOUT_GUARDED_KEYS.filter((k) => !effective.includes(k));
      if (missing.length > 0) {
        throw new ForbiddenException({
          code: ApiErrorCode.FORBIDDEN,
          message: 'You would lock yourself out by removing these permissions',
          details: { missing },
        });
      }
    }

    const updated = await this.roles.update(id, data);
    this.resolver.invalidate(id);
    return this.toDto(updated, existing._count.admins);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.roles.findWithMemberCount(id);
    if (!existing) throw this.notFound();
    if (existing.isSystem) throw this.systemLocked();
    if (existing._count.admins > 0) {
      throw new ConflictException({
        code: ApiErrorCode.ROLE_HAS_MEMBERS,
        message:
          I18nContext.current()?.t('errors.role-has-members') ??
          'Reassign every admin in this role before deleting it',
        details: { adminCount: existing._count.admins },
      });
    }
    await this.roles.delete(id);
    this.resolver.invalidate(id);
  }

  private normalizePermissions(selected: readonly string[]): string[] {
    return expandToLeaves(selected, PERMISSION_TREE_ADMIN);
  }

  private toDto(r: AdminRoleRecord, memberCount: number): RoleDto {
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
