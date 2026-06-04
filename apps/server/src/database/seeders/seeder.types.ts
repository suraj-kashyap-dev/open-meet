import type { PrismaClient } from '@prisma/client';

export interface Seeder {
  readonly name: string;
  run(prisma: PrismaClient): Promise<string>;
}
