import { Injectable } from '@nestjs/common';
import type { Prisma, UserRoleRecord } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserRoleRecord | null> {
    return this.prisma.userRoleRecord.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<UserRoleRecord | null> {
    return this.prisma.userRoleRecord.findUnique({ where: { name } });
  }

  list(): Promise<Array<UserRoleRecord & { _count: { users: number } }>> {
    return this.prisma.userRoleRecord.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { users: true } } },
    });
  }

  findWithMemberCount(
    id: string,
  ): Promise<(UserRoleRecord & { _count: { users: number } }) | null> {
    return this.prisma.userRoleRecord.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
  }

  create(data: {
    name: string;
    description?: string | null;
    permissionType: 'ALL' | 'CUSTOM';
    permissions: string[];
  }): Promise<UserRoleRecord> {
    return this.prisma.userRoleRecord.create({ data });
  }

  update(
    id: string,
    data: Pick<Prisma.UserRoleRecordUpdateInput, 'name' | 'description' | 'permissionType' | 'permissions'>,
  ): Promise<UserRoleRecord> {
    return this.prisma.userRoleRecord.update({
      where: { id },
      data: { ...data, cacheRev: { increment: 1 } },
    });
  }

  delete(id: string): Promise<UserRoleRecord> {
    return this.prisma.userRoleRecord.delete({ where: { id } });
  }

  countUsersForRole(id: string): Promise<number> {
    return this.prisma.user.count({ where: { roleRecordId: id } });
  }

  async upsertSystem(input: {
    id: string;
    name: string;
    description: string;
    permissionType: 'ALL' | 'CUSTOM';
    defaultPermissions: readonly string[];
  }): Promise<UserRoleRecord> {
    return this.prisma.userRoleRecord.upsert({
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
   * Seeds a built-in default role that is NOT a system role — it backs a fallback
   * (e.g. the role assigned to ephemeral guest users) but stays fully editable and
   * deletable. Created only if missing; on existing rows we just ensure `isSystem`
   * is false so operator edits to name/description/permissions survive.
   */
  async ensureDefault(input: {
    id: string;
    name: string;
    description: string;
    permissionType: 'ALL' | 'CUSTOM';
    defaultPermissions: readonly string[];
  }): Promise<UserRoleRecord> {
    return this.prisma.userRoleRecord.upsert({
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
