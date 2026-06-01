import { Injectable } from '@nestjs/common';
import type { AdminRoleRecord, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AdminRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<AdminRoleRecord | null> {
    return this.prisma.adminRoleRecord.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<AdminRoleRecord | null> {
    return this.prisma.adminRoleRecord.findUnique({ where: { name } });
  }

  list(): Promise<Array<AdminRoleRecord & { _count: { admins: number } }>> {
    return this.prisma.adminRoleRecord.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { admins: true } } },
    });
  }

  findWithMemberCount(
    id: string,
  ): Promise<(AdminRoleRecord & { _count: { admins: number } }) | null> {
    return this.prisma.adminRoleRecord.findUnique({
      where: { id },
      include: { _count: { select: { admins: true } } },
    });
  }

  create(data: {
    name: string;
    description?: string | null;
    permissionType: 'ALL' | 'CUSTOM';
    permissions: string[];
  }): Promise<AdminRoleRecord> {
    return this.prisma.adminRoleRecord.create({ data });
  }

  /** Updates the role and bumps `cacheRev` atomically so callers can invalidate caches. */
  update(
    id: string,
    data: Pick<Prisma.AdminRoleRecordUpdateInput, 'name' | 'description' | 'permissionType' | 'permissions'>,
  ): Promise<AdminRoleRecord> {
    return this.prisma.adminRoleRecord.update({
      where: { id },
      data: { ...data, cacheRev: { increment: 1 } },
    });
  }

  delete(id: string): Promise<AdminRoleRecord> {
    return this.prisma.adminRoleRecord.delete({ where: { id } });
  }

  countAdminsForRole(id: string): Promise<number> {
    return this.prisma.admin.count({ where: { roleRecordId: id } });
  }

  /**
   * Idempotent system-role seeder. Forces `permissionType` and `isSystem` on every run
   * so the invariants (Administrator is always ALL, system roles cannot drift) hold -
   * but does NOT overwrite `permissions` on existing records so operator tweaks survive.
   */
  async upsertSystem(input: {
    id: string;
    name: string;
    description: string;
    permissionType: 'ALL' | 'CUSTOM';
    defaultPermissions: readonly string[];
  }): Promise<AdminRoleRecord> {
    return this.prisma.adminRoleRecord.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        name: input.name,
        description: input.description,
        permissionType: input.permissionType,
        permissions: [...input.defaultPermissions],
        isSystem: true,
      },
      update: {
        description: input.description,
        permissionType: input.permissionType,
        isSystem: true,
      },
    });
  }

  /**
   * Seeds a built-in default role that is NOT a system role - it backs a fallback
   * (e.g. the role assigned to admins invited without an explicit role) but stays
   * fully editable and deletable. Created only if missing; on existing rows we just
   * ensure `isSystem` is false so operator edits to name/description/permissions survive.
   */
  async ensureDefault(input: {
    id: string;
    name: string;
    description: string;
    permissionType: 'ALL' | 'CUSTOM';
    defaultPermissions: readonly string[];
  }): Promise<AdminRoleRecord> {
    return this.prisma.adminRoleRecord.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        name: input.name,
        description: input.description,
        permissionType: input.permissionType,
        permissions: [...input.defaultPermissions],
        isSystem: false,
      },
      update: { isSystem: false },
    });
  }
}
