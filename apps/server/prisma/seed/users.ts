/**
 * Users-only seeder. Inserts a small roster of demo users that can actually log
 * in (real argon2id password hashes, email pre-verified). Idempotent: existing
 * emails are skipped, so it is safe to re-run.
 *
 * Run via `pnpm --filter @open-meet/server db:seed:users` or the setup flag
 * `./setup.sh --seed`. Does NOT touch conversations or admins.
 */
import { existsSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

// Mirror prisma.config.ts: load apps/server/.env when run as a standalone script.
if (existsSync('.env')) {
  process.loadEnvFile();
}

const prisma = new PrismaClient();

// Shared password for every seeded user - convenient for local demos only.
const DEFAULT_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'Password123!';

interface SeedUser {
  name: string;
  email: string;
  timezone: string;
  language: string;
  bio?: string;
}

const USERS: SeedUser[] = [
  {
    name: 'Ada Lovelace',
    email: 'ada@open-meet.dev',
    timezone: 'Europe/London',
    language: 'en',
    bio: 'Counting on it.',
  },
  {
    name: 'Alan Turing',
    email: 'alan@open-meet.dev',
    timezone: 'Europe/London',
    language: 'en',
    bio: 'Codebreaker.',
  },
  {
    name: 'Grace Hopper',
    email: 'grace@open-meet.dev',
    timezone: 'America/New_York',
    language: 'en',
    bio: 'Found the first bug.',
  },
  {
    name: 'Katherine Johnson',
    email: 'katherine@open-meet.dev',
    timezone: 'America/Chicago',
    language: 'en',
  },
  {
    name: 'Hedy Lamarr',
    email: 'hedy@open-meet.dev',
    timezone: 'America/Los_Angeles',
    language: 'en',
  },
  {
    name: 'Tim Berners-Lee',
    email: 'tim@open-meet.dev',
    timezone: 'Europe/London',
    language: 'en',
  },
  {
    name: 'Margaret Hamilton',
    email: 'margaret@open-meet.dev',
    timezone: 'America/Denver',
    language: 'en',
  },
  {
    name: 'Linus Torvalds',
    email: 'linus@open-meet.dev',
    timezone: 'Europe/Helsinki',
    language: 'en',
  },
];

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set - cannot seed users.');
  }

  const passwordHash = await argon2.hash(DEFAULT_PASSWORD, { type: argon2.argon2id });

  let created = 0;
  let existingCount = 0;

  for (const user of USERS) {
    const email = user.email.toLowerCase();

    // Find-or-create the user (idempotent).
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      existingCount += 1;
      continue;
    }

    await prisma.user.create({
      data: {
        name: user.name,
        email,
        passwordHash,
        emailVerifiedAt: new Date(),
        timezone: user.timezone,
        language: user.language,
        bio: user.bio ?? null,
        canCreateGroups: true,
        settings: { create: {} },
      },
    });
    created += 1;
  }

  console.info(`Users seeded: ${created} created, ${existingCount} already existed.`);
  if (created > 0) {
    console.info(`Login with any seeded email and password "${DEFAULT_PASSWORD}".`);
  }
}

main()
  .catch((err) => {
    console.error('User seeding failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
