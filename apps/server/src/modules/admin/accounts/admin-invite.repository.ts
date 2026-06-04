import { Injectable } from '@nestjs/common';
import type { AdminInvite } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

export type AdminInviteWithInviter = AdminInvite & {
  invitedBy: { name: string } | null;
  roleRecord: { id: string; name: string; permissionType: 'ALL' | 'CUSTOM' } | null;
};

@Injectable()
export class AdminInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertByEmail(data: {
    email: string;
    name: string;
    roleRecordId: string | null;
    tokenHash: string;
    invitedById: string | null;
    expiresAt: Date;
  }): Promise<AdminInvite> {
    const { email, name, roleRecordId, tokenHash, invitedById, expiresAt } = data;
    return this.prisma.adminInvite.upsert({
      where: { email },
      create: { email, name, roleRecordId, tokenHash, invitedById, expiresAt },
      update: { name, roleRecordId, tokenHash, invitedById, expiresAt },
    });
  }

  findById(id: string): Promise<AdminInvite | null> {
    return this.prisma.adminInvite.findUnique({ where: { id } });
  }

  findByTokenHash(tokenHash: string): Promise<AdminInvite | null> {
    return this.prisma.adminInvite.findUnique({ where: { tokenHash } });
  }

  listPending(): Promise<AdminInviteWithInviter[]> {
    return this.prisma.adminInvite.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { name: true } },
        roleRecord: { select: { id: true, name: true, permissionType: true } },
      },
    });
  }

  refreshToken(id: string, tokenHash: string, expiresAt: Date): Promise<AdminInvite> {
    return this.prisma.adminInvite.update({ where: { id }, data: { tokenHash, expiresAt } });
  }

  delete(id: string): Promise<AdminInvite> {
    return this.prisma.adminInvite.delete({ where: { id } });
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.prisma.adminInvite.deleteMany({ where: { email } });
  }
}
