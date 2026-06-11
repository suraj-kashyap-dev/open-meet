import { existsSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

import { runSeeders } from './seeder.runner';

if (existsSync('.env')) {
  process.loadEnvFile();
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set - cannot seed.');
  }

  const prisma = new PrismaClient();
  const only = process.argv.slice(2).filter(Boolean);

  try {
    await runSeeders(prisma, only.length > 0 ? only : undefined);

    console.info('Seeding complete.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err instanceof Error ? err.message : err);

  process.exitCode = 1;
});
