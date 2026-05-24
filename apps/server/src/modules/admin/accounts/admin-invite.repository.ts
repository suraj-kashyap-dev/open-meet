import { Injectable } from '@nestjs/common';
import type { AdminInvite, AdminRole } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

export type AdminInviteWithInviter = AdminInvite & { invitedBy: { name: string } | null };

@Injectable()
export class AdminInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create the invite, or overwrite an existing pending one for the same
   * email with a fresh token + expiry (so re-inviting just refreshes it).
   */
  upsertByEmail(data: {
    email: string;
    name: string;
    role: AdminRole;
    tokenHash: string;
    invitedById: string | null;
    expiresAt: Date;
  }): Promise<AdminInvite> {
    const { email, name, role, tokenHash, invitedById, expiresAt } = data;
    return this.prisma.adminInvite.upsert({
      where: { email },
      create: { email, name, role, tokenHash, invitedById, expiresAt },
      update: { name, role, tokenHash, invitedById, expiresAt },
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
      include: { invitedBy: { select: { name: true } } },
    });
  }

  refreshToken(id: string, tokenHash: string, expiresAt: Date): Promise<AdminInvite> {
    return this.prisma.adminInvite.update({ where: { id }, data: { tokenHash, expiresAt } });
  }

  delete(id: string): Promise<AdminInvite> {
    return this.prisma.adminInvite.delete({ where: { id } });
  }
}
