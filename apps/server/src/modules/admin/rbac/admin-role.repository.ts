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

  update(
    id: string,
    data: Pick<
      Prisma.AdminRoleRecordUpdateInput,
      'name' | 'description' | 'permissionType' | 'permissions'
    >,
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
