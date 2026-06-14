import { Injectable } from '@nestjs/common';
import { type Prisma, type User } from '@prisma/client';

import { PrismaService } from '@/database/services/prisma.service';

const userInclude = {
  _count: { select: { hostedMeetings: true, meetings: true } },
} satisfies Prisma.UserInclude;

export type UserWithCounts = User & {
  _count: {
    hostedMeetings: number;
    meetings: number;
  };
};

interface ListParams {
  skip: number;
  take: number;
  search?: string;
}

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private whereFor(search?: string): Prisma.UserWhereInput {
    if (!search) {
      return {};
    }

    return {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  searchWhere(search?: string): Prisma.UserWhereInput {
    return this.whereFor(search);
  }

  list({ skip, take, search }: ListParams): Promise<UserWithCounts[]> {
    return this.prisma.user.findMany({
      skip,
      take,
      where: this.whereFor(search),
      orderBy: { createdAt: 'desc' },
      include: userInclude,
    });
  }

  listWith(params: {
    skip: number;
    take: number;
    where: Prisma.UserWhereInput;
    orderBy: Prisma.UserOrderByWithRelationInput;
  }): Promise<UserWithCounts[]> {
    return this.prisma.user.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
      include: userInclude,
    });
  }

  count(search?: string): Promise<number> {
    return this.prisma.user.count({ where: this.whereFor(search) });
  }

  countWith(where: Prisma.UserWhereInput): Promise<number> {
    return this.prisma.user.count({ where });
  }

  emailTaken(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    timezone?: string;
    language?: string;
    bio?: string | null;
    canCreateGroups?: boolean;
  }): Promise<UserWithCounts> {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        emailVerifiedAt: new Date(),
        timezone: data.timezone,
        language: data.language,
        bio: data.bio ?? null,
        canCreateGroups: data.canCreateGroups,
      },
      include: userInclude,
    });
  }

  findById(id: string): Promise<UserWithCounts | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
  }

  emailTakenByOther(email: string, excludeId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), NOT: { id: excludeId } },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<UserWithCounts> {
    return this.prisma.user.update({
      where: { id },
      data,
      include: userInclude,
    });
  }

  delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}
