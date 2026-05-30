import { Injectable } from '@nestjs/common';
import { type Prisma, type User } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

import {
  SYSTEM_USER_MEMBER_ROLE_ID,
  SYSTEM_USER_RESTRICTED_ROLE_ID,
} from '../rbac/user-rbac-seed.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  create(input: { name: string; email: string; passwordHash: string }): Promise<User> {
    return this.prisma.user.create({
      data: { ...input, email: input.email.toLowerCase(), roleRecordId: SYSTEM_USER_MEMBER_ROLE_ID },
    });
  }

  /** Create a user whose email is already verified (invite acceptance). */
  createInvited(input: { name: string; email: string; passwordHash: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...input,
        email: input.email.toLowerCase(),
        emailVerifiedAt: new Date(),
        roleRecordId: SYSTEM_USER_MEMBER_ROLE_ID,
      },
    });
  }

  /**
   * Create an ephemeral guest user for a meeting-scoped access token.
   * Guests get the Restricted role so they cannot trigger user-permission-gated
   * endpoints even if they crafted a request — meeting access is already
   * scoped via the JWT `guest: true` flag.
   */
  createGuest(input: { name: string; email: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        emailVerifiedAt: new Date(),
        roleRecordId: SYSTEM_USER_RESTRICTED_ROLE_ID,
      },
    });
  }

  createGoogleUser(input: {
    name: string;
    email: string;
    googleId: string;
    avatarUrl: string | null;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        googleId: input.googleId,
        avatarUrl: input.avatarUrl,
        roleRecordId: SYSTEM_USER_MEMBER_ROLE_ID,
      },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /** User + their settings (for profile visibility checks). */
  findByIdWithSettings(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { settings: true },
    });
  }
}
