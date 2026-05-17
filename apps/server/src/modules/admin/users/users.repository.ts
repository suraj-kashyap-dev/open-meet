import { Injectable } from '@nestjs/common';
import { type Prisma, type User } from '@prisma/client';

import { type PrismaService } from '../../../database/prisma.service';

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

  private whereFromSearch(search?: string): Prisma.UserWhereInput {
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

  list({ skip, take, search }: ListParams): Promise<UserWithCounts[]> {
    return this.prisma.user.findMany({
      skip,
      take,
      where: this.whereFromSearch(search),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { hostedMeetings: true, meetings: true } } },
    });
  }

  count(search?: string): Promise<number> {
    return this.prisma.user.count({ where: this.whereFromSearch(search) });
  }

  findById(id: string): Promise<UserWithCounts | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { hostedMeetings: true, meetings: true } } },
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
      include: { _count: { select: { hostedMeetings: true, meetings: true } } },
    });
  }

  delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}
