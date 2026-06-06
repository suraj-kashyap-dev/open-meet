import { Injectable } from '@nestjs/common';
import type { Admin, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  searchWhere(search?: string): Prisma.AdminWhereInput {
    if (!search) return {};
    return {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  listWith(params: {
    skip: number;
    take: number;
    where: Prisma.AdminWhereInput;
    orderBy: Prisma.AdminOrderByWithRelationInput;
  }): Promise<Admin[]> {
    return this.prisma.admin.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
    });
  }

  countWith(where: Prisma.AdminWhereInput): Promise<number> {
    return this.prisma.admin.count({ where });
  }

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

  countByRoleRecord(roleRecordId: string): Promise<number> {
    return this.prisma.admin.count({ where: { roleRecordId } });
  }
}
