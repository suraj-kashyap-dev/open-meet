import { existsSync } from 'node:fs';

import * as p from '@clack/prompts';

import { writeServerEnv, writeWebEnv } from './install/env-files.js';
import { updateLivekitYaml } from './install/livekit-yaml.js';
import { SERVER_ENV, WEB_ENV } from './install/paths.js';
import { collectAnswers, confirmOverwriteIfExists } from './install/prompts.js';
import {
  PrismaDllLockedError,
  createAdminUser,
  runPrismaGenerate,
  runPrismaMigrateDeploy,
  runPrismaMigrateReset,
} from './install/run.js';
import { generateSecrets } from './install/secrets.js';

const FORCE = process.argv.slice(2).some((arg) => arg === '--force' || arg === '-f');

async function step(label: string, fn: () => void | Promise<void>): Promise<void> {
  const spinner = p.spinner();

  spinner.start(label);

  try {
    await fn();
    spinner.stop(`${label} — done`);
  } catch (err) {
    spinner.stop(`${label} — failed`);
    throw err;
  }
}

async function runPrismaGenerateWithLockRecovery(): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await step(`Running prisma generate (attempt ${attempt})`, runPrismaGenerate);
      return;
    } catch (err) {
      if (! (err instanceof PrismaDllLockedError)) {
        throw err;
      }

      p.log.warn(
        [
          'Prisma cannot overwrite query_engine-windows.dll.node — another Node process is holding the file open.',
          '',
          'Close these and try again:',
          '  1. Stop the dev server (Ctrl+C on `pnpm dev`).',
          '  2. Close Prisma Studio if open.',
          '  3. Kill any leftover Node processes:',
          '       PowerShell:  Get-Process node | Stop-Process -Force',
          '       cmd:         taskkill /F /IM node.exe',
          '  4. Pause OneDrive sync for this folder (the repo lives under OneDrive\\Desktop).',
          '',
          `Original error: ${err.originalMessage.split('\n')[0]}`,
        ].join('\n'),
      );

      const choice = await p.select({
        message: 'What would you like to do?',
        options: [
          { value: 'retry', label: 'Retry prisma generate' },
          { value: 'skip', label: 'Skip prisma generate (continue without regenerating client)' },
          { value: 'abort', label: 'Abort installation' },
        ],
        initialValue: 'retry',
      });

      if (p.isCancel(choice) || choice === 'abort') {
        p.cancel('Installation aborted — Prisma DLL locked.');
        process.exit(1);
      }

      if (choice === 'skip') {
        p.log.warn('Skipped prisma generate. Run it manually later: pnpm --filter @open-meet/server prisma:generate');
        return;
      }
    }
  }
}

async function confirmForceWipe(): Promise<void> {
  p.log.warn(
    [
      '--force is enabled. This will:',
      '  • Overwrite apps/server/.env and apps/web/.env.local without prompting.',
      '  • DROP and recreate the database (every table — meetings, messages, users, admins — will be deleted).',
      '  • Regenerate LiveKit API key + secret.',
      '  • Re-create the admin user from the values you provide below.',
    ].join('\n'),
  );

  const confirmed = await p.confirm({
    message: 'Proceed with destructive reinstall?',
    initialValue: false,
  });

  if (p.isCancel(confirmed) || ! confirmed) {
    p.cancel('Installation aborted.');
    process.exit(0);
  }
}

async function main(): Promise<void> {
  p.intro(FORCE ? 'open-meet installer (--force)' : 'open-meet installer');

  if (FORCE) {
    await confirmForceWipe();
  } else {
    await confirmOverwriteIfExists(existsSync(SERVER_ENV), existsSync(WEB_ENV));
  }

  const answers = await collectAnswers();
  const secrets = generateSecrets();

  await step('Writing apps/server/.env', () => writeServerEnv(answers, secrets));
  await step('Writing apps/web/.env.local', () => writeWebEnv(answers));
  await step('Updating docker/livekit.yaml', () =>
    updateLivekitYaml(secrets.LIVEKIT_API_KEY, secrets.LIVEKIT_API_SECRET),
  );

  if (answers.runMigrations || FORCE) {
    if (process.platform === 'win32') {
      p.log.info(
        'Heads up: on Windows, Prisma cannot regenerate while the dev server or Prisma Studio is running (file lock on query_engine-windows.dll.node). Close them first.',
      );
    }

    await runPrismaGenerateWithLockRecovery();

    if (FORCE) {
      await step('Resetting database (drop + re-apply all migrations)', runPrismaMigrateReset);
    } else {
      await step('Applying database migrations', runPrismaMigrateDeploy);
    }
  } else {
    p.log.warn('Skipped migrations. Run later: pnpm --filter @open-meet/server prisma:migrate');
  }

  if (answers.createAdmin || FORCE) {
    await step(`Creating admin user ${answers.adminEmail}`, () => createAdminUser(answers));
  } else {
    p.log.warn(
      'Skipped admin creation. The server will auto-create it on first boot from DEFAULT_ADMIN_* env vars.',
    );
  }

  p.note(
    [
      `Admin email:    ${answers.adminEmail}`,
      `Admin password: ${answers.adminPassword}`,
      `LiveKit key:    ${secrets.LIVEKIT_API_KEY}`,
      `LiveKit secret: ${secrets.LIVEKIT_API_SECRET}`,
      '',
      'Files written:',
      '  - apps/server/.env',
      '  - apps/web/.env.local',
      '  - docker/livekit.yaml (keys updated)',
    ].join('\n'),
    FORCE ? 'Reinstall summary' : 'Installation summary',
  );

  p.outro('Done. Start the stack with `docker compose up -d` then `pnpm dev`.');
}

main().catch((err) => {
  p.log.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exit(1);
});
