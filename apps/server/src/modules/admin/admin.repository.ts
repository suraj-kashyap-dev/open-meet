import { Injectable } from '@nestjs/common';
import type { Admin, AdminRole } from '@prisma/client';

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
    return this.prisma.admin.findMany({ orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] });
  }

  create(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: AdminRole;
  }): Promise<Admin> {
    return this.prisma.admin.create({ data });
  }

  delete(id: string): Promise<Admin> {
    return this.prisma.admin.delete({ where: { id } });
  }

  countByRole(role: AdminRole): Promise<number> {
    return this.prisma.admin.count({ where: { role } });
  }
}
