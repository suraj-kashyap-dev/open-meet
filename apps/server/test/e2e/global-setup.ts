import { execSync } from 'node:child_process';

// Runs once before the whole e2e suite: ensure the throwaway test database
// exists and its schema matches the current Prisma schema. `prisma db push`
// creates the database if it is missing.
export default function setup(): void {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/openmeet_test';

  execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
