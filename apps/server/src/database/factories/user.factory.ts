import type { Prisma } from '@prisma/client';

export const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'Password123!';

const ROSTER: { name: string; timezone: string; bio?: string }[] = [
  { name: 'Ada Lovelace', timezone: 'Europe/London', bio: 'Counting on it.' },
  { name: 'Alan Turing', timezone: 'Europe/London', bio: 'Codebreaker.' },
  { name: 'Grace Hopper', timezone: 'America/New_York', bio: 'Found the first bug.' },
  { name: 'Katherine Johnson', timezone: 'America/Chicago' },
  { name: 'Hedy Lamarr', timezone: 'America/Los_Angeles' },
  { name: 'Tim Berners-Lee', timezone: 'Europe/London' },
  { name: 'Margaret Hamilton', timezone: 'America/Denver' },
  { name: 'Linus Torvalds', timezone: 'Europe/Helsinki' },
];

export const USER_ROSTER_SIZE = ROSTER.length;

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

export function makeUser(
  index: number,
  passwordHash: string,
  overrides: Partial<Prisma.UserCreateInput> = {},
): Prisma.UserCreateInput {
  const base = ROSTER[index % ROSTER.length]!;
  const name = base.name;
  const email = `${slug(name)}@open-meet.dev`;

  return {
    name,
    email,
    passwordHash,
    emailVerifiedAt: new Date(),
    timezone: base.timezone,
    language: 'en',
    bio: base.bio ?? null,
    canCreateGroups: true,
    settings: { create: {} },
    ...overrides,
  };
}
