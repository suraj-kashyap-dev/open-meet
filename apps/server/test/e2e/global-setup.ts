import { execSync } from 'node:child_process';

export default function setup(): void {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/openmeet_test';

  execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
