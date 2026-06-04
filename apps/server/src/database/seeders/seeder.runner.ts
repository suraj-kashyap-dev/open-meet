import type { PrismaClient } from '@prisma/client';

import { seeders } from './seeds';
import type { Seeder } from './seeder.types';

export async function runSeeders(prisma: PrismaClient, only?: string[]): Promise<void> {
  let list: Seeder[] = seeders;

  if (only && only.length > 0) {
    const known = new Set(seeders.map((s) => s.name));
    const unknown = only.filter((n) => !known.has(n));
    if (unknown.length > 0) {
      throw new Error(
        `Unknown seeder(s): ${unknown.join(', ')}. Available: ${[...known].join(', ')}`,
      );
    }
    list = seeders.filter((s) => only.includes(s.name));
  }

  for (const seeder of list) {
    const summary = await seeder.run(prisma);
    console.info(`✓ ${seeder.name}: ${summary}`);
  }
}
