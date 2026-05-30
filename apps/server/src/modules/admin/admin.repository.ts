import { Injectable } from '@nestjs/common';
import type { Admin } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { id } });
  }

  touchLastLogin(id: string): Promise<Admin> {
    return this.prisma.admin.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  list(): Promise<Admin[]> {
    return this.prisma.admin.findMany({ orderBy: [{ createdAt: 'asc' }] });
  }

  create(data: {
    email: string;
    name: string;
    passwordHash: string;
    roleRecordId: string;
  }): Promise<Admin> {
    return this.prisma.admin.create({ data });
  }

  update(
    id: string,
    data: { name?: string; avatarKey?: string | null; passwordHash?: string },
  ): Promise<Admin> {
    return this.prisma.admin.update({ where: { id }, data });
  }

  updateRoleRecord(id: string, roleRecordId: string): Promise<Admin> {
    return this.prisma.admin.update({ where: { id }, data: { roleRecordId } });
  }

  delete(id: string): Promise<Admin> {
    return this.prisma.admin.delete({ where: { id } });
  }

  /** Count admins assigned to a given RBAC role id. Replaces the legacy countByRole enum. */
  countByRoleRecord(roleRecordId: string): Promise<number> {
    return this.prisma.admin.count({ where: { roleRecordId } });
  }
}
