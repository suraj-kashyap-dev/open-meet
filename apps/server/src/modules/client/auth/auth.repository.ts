import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';

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

  create(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: { ...input, email: input.email.toLowerCase() },
    });
  }

  update(id: string, data: { name?: string }): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
