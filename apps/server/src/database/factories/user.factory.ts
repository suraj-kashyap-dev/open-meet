import type { Prisma } from '@prisma/client';

export const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'Password123!';

const ROSTER: { name: string; timezone: string; bio?: string }[] = [
  {
    name: 'Ada Lovelace',
    timezone: 'Europe/London',
    bio: 'Product-minded engineer who turns complex ideas into clear collaboration workflows.',
  },
  {
    name: 'Alan Turing',
    timezone: 'Europe/London',
    bio: 'Security-focused systems thinker with a habit of simplifying difficult problems.',
  },
  {
    name: 'Grace Hopper',
    timezone: 'America/New_York',
    bio: 'Developer advocate and tooling expert who helps teams ship with confidence.',
  },
  {
    name: 'Katherine Johnson',
    timezone: 'America/Chicago',
    bio: 'Data-driven project lead who keeps meeting plans grounded, precise, and actionable.',
  },
  {
    name: 'Hedy Lamarr',
    timezone: 'America/Los_Angeles',
    bio: 'Inventive product designer focused on reliable communication and elegant user flows.',
  },
  {
    name: 'Tim Berners-Lee',
    timezone: 'Europe/London',
    bio: 'Open-web architect who cares about accessible, connected, and portable collaboration.',
  },
  {
    name: 'Margaret Hamilton',
    timezone: 'America/Denver',
    bio: 'Reliability lead who brings careful planning and calm incident response to every team.',
  },
  {
    name: 'Linus Torvalds',
    timezone: 'Europe/Helsinki',
    bio: 'Platform engineer who prefers practical reviews, fast feedback, and dependable releases.',
  },
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
