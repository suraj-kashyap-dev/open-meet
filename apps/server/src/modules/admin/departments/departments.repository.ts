import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

const memberInclude = {
  user: { select: { id: true, name: true, email: true, avatarKey: true } },
} satisfies Prisma.DepartmentMemberInclude;

const departmentInclude = {
  responsibleAdmin: { select: { id: true, name: true } },
  _count: { select: { members: true } },
} satisfies Prisma.DepartmentInclude;

export type DepartmentMemberWithUser = Prisma.DepartmentMemberGetPayload<{ include: typeof memberInclude }>;
export type DepartmentWithCount = Prisma.DepartmentGetPayload<{ include: typeof departmentInclude }>;

export interface DepartmentWriteData {
  name?: string;
  description?: string | null;
  responsibleAdminId?: string | null;
}

@Injectable()
export class AdminDepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<DepartmentWithCount[]> {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' }, include: departmentInclude });
  }

  findWithCount(id: string): Promise<DepartmentWithCount | null> {
    return this.prisma.department.findUnique({ where: { id }, include: departmentInclude });
  }

  create(data: {
    name: string;
    description: string | null;
    responsibleAdminId: string | null;
  }): Promise<DepartmentWithCount> {
    return this.prisma.department.create({ data, include: departmentInclude });
  }

  update(id: string, data: DepartmentWriteData): Promise<DepartmentWithCount> {
    return this.prisma.department.update({ where: { id }, data, include: departmentInclude });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.department.delete({ where: { id } });
  }

  members(departmentId: string): Promise<DepartmentMemberWithUser[]> {
    return this.prisma.departmentMember.findMany({
      where: { departmentId },
      orderBy: { joinedAt: 'asc' },
      include: memberInclude,
    });
  }

  async addMembers(departmentId: string, userIds: string[]): Promise<void> {
    await this.prisma.departmentMember.createMany({
      data: userIds.map((userId) => ({ departmentId, userId })),
      skipDuplicates: true,
    });
  }

  async removeMember(departmentId: string, userId: string): Promise<void> {
    await this.prisma.departmentMember.deleteMany({ where: { departmentId, userId } });
  }

  adminExists(id: string): Promise<boolean> {
    return this.prisma.admin.count({ where: { id } }).then((c) => c > 0);
  }
}
