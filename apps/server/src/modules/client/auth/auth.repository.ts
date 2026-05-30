import { Injectable } from '@nestjs/common';
import { type Prisma, type User } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';

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
      data: { ...input, email: input.email.toLowerCase() },
    });
  }

  /** Create a user whose email is already verified (invite acceptance). */
  createInvited(input: {
    name: string;
    email: string;
    passwordHash: string;
    timezone?: string;
    language?: string;
    bio?: string | null;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        emailVerifiedAt: new Date(),
        timezone: input.timezone,
        language: input.language,
        bio: input.bio ?? null,
      },
    });
  }

  /**
   * Create an ephemeral guest user for a meeting-scoped access token. Guests
   * cannot create groups; meeting access is scoped via the JWT `guest: true` flag.
   */
  createGuest(input: { name: string; email: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        emailVerifiedAt: new Date(),
        canCreateGroups: false,
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
