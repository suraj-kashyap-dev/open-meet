import { execSync } from 'node:child_process';

import { ROOT } from './paths.js';
import type { InstallAnswers } from './prompts.js';

export class PrismaDllLockedError extends Error {
  constructor(public readonly originalMessage: string) {
    super(originalMessage);
    this.name = 'PrismaDllLockedError';
  }
}

interface ExecError extends Error {
  stdout?: Buffer | string;
  stderr?: Buffer | string;
}

function bufferToString(value: Buffer | string | undefined): string {
  if (! value) {
    return '';
  }

  return typeof value === 'string' ? value : value.toString('utf8');
}

function fullErrorMessage(err: unknown): string {
  if (! (err instanceof Error)) {
    return String(err);
  }

  const e = err as ExecError;
  const parts = [e.message, bufferToString(e.stdout).trim(), bufferToString(e.stderr).trim()];

  return parts.filter(Boolean).join('\n');
}

function exec(cmd: string, env?: NodeJS.ProcessEnv): void {
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: 'pipe',
      env: env ?? process.env,
    });
  } catch (err) {
    throw new Error(fullErrorMessage(err));
  }
}

function isLockedDllError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);

  return /EPERM[\s\S]*query_engine[\s\S]*\.dll\.node/.test(message);
}

export function runPrismaGenerate(): void {
  try {
    exec('pnpm --filter @open-meet/server exec prisma generate');
  } catch (err) {
    if (isLockedDllError(err)) {
      throw new PrismaDllLockedError(err instanceof Error ? err.message : String(err));
    }

    throw err;
  }
}

export function runPrismaMigrateDeploy(): void {
  exec('pnpm --filter @open-meet/server exec prisma migrate deploy');
}

export function runPrismaMigrateReset(): void {
  exec('pnpm --filter @open-meet/server exec prisma migrate reset --force --skip-seed');
}

export function createAdminUser(answers: InstallAnswers): void {
  exec('pnpm exec tsx scripts/install/create-admin.ts', {
    ...process.env,
    DATABASE_URL: answers.databaseUrl,
    DEFAULT_ADMIN_EMAIL: answers.adminEmail,
    DEFAULT_ADMIN_PASSWORD: answers.adminPassword,
    DEFAULT_ADMIN_NAME: answers.adminName,
  });
}
