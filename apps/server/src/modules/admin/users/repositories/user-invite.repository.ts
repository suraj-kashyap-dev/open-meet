import { Injectable } from '@nestjs/common';
import type { UserInvite } from '@prisma/client';

import { PrismaService } from '../../../../database/services/prisma.service';

export type UserInviteWithInviter = UserInvite & { invitedBy: { name: string } | null };

@Injectable()
export class AdminUserInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async userExistsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email: email.toLowerCase() } });
    return count > 0;
  }

  upsertByEmail(data: {
    email: string;
    name: string;
    tokenHash: string;
    invitedById: string | null;
    expiresAt: Date;
  }): Promise<UserInvite> {
    const { email, name, tokenHash, invitedById, expiresAt } = data;

    return this.prisma.userInvite.upsert({
      where: { email },
      create: { email, name, tokenHash, invitedById, expiresAt },
      update: { name, tokenHash, invitedById, expiresAt },
    });
  }

  findById(id: string): Promise<UserInvite | null> {
    return this.prisma.userInvite.findUnique({ where: { id } });
  }

  listPending(): Promise<UserInviteWithInviter[]> {
    return this.prisma.userInvite.findMany({
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { name: true } } },
    });
  }

  refreshToken(id: string, tokenHash: string, expiresAt: Date): Promise<UserInvite> {
    return this.prisma.userInvite.update({ where: { id }, data: { tokenHash, expiresAt } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userInvite.delete({ where: { id } });
  }
}
