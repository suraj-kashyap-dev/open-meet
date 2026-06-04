import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

export interface TeammateRow {
  id: string;
  name: string;
  email: string;
  avatarKey: string | null;
  chatDisabled: boolean;
  allowDirectMessages: boolean;
}

@Injectable()
export class TeammatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  search(userId: string, query?: string): Promise<TeammateRow[]> {
    const trimmed = query?.trim();

    return this.prisma.user
      .findMany({
        where: {
          id: { not: userId },
          ...(trimmed
            ? {
                OR: [
                  { name: { contains: trimmed, mode: 'insensitive' as const } },
                  { email: { contains: trimmed, mode: 'insensitive' as const } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarKey: true,
          chatDisabled: true,
          settings: { select: { allowDirectMessages: true } },
        },
        orderBy: { name: 'asc' },
        take: 50,
      })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          avatarKey: row.avatarKey,
          chatDisabled: row.chatDisabled,
          allowDirectMessages: row.settings?.allowDirectMessages ?? true,
        })),
      );
  }

  async directConversationIds(userId: string, otherIds: string[]): Promise<Map<string, string>> {
    if (otherIds.length === 0) {
      return new Map();
    }

    const keys = otherIds.map((other) => [userId, other].sort().join(':'));
    const rows = await this.prisma.conversation.findMany({
      where: { directKey: { in: keys } },
      select: { id: true, directKey: true },
    });

    const result = new Map<string, string>();

    for (const row of rows) {
      if (!row.directKey) {
        continue;
      }

      const [a, b] = row.directKey.split(':');
      const other = a === userId ? b : a;

      if (other) {
        result.set(other, row.id);
      }
    }

    return result;
  }
}
