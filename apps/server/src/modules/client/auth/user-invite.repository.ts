import { Injectable } from '@nestjs/common';
import type { UserInvite } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UserInviteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTokenHash(tokenHash: string): Promise<UserInvite | null> {
    return this.prisma.userInvite.findUnique({ where: { tokenHash } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userInvite.delete({ where: { id } });
  }
}
