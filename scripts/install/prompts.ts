import * as p from '@clack/prompts';

export interface InstallAnswers {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  databaseUrl: string;
  redisUrl: string;
  frontendUrl: string;
  apiUrl: string;
  livekitHost: string;
  runMigrations: boolean;
  createAdmin: boolean;
}

function abortIfCancelled<T>(value: T | symbol, label: string): T {
  if (typeof value === 'symbol') {
    p.cancel(`Cancelled while collecting "${label}".`);
    process.exit(0);
  }

  return value as T;
}

export async function confirmOverwriteIfExists(
  serverEnvExists: boolean,
  webEnvExists: boolean,
): Promise<void> {
  if (!serverEnvExists && !webEnvExists) {
    return;
  }

  p.log.warn(
    `Detected existing env files:${serverEnvExists ? '\n  - apps/server/.env' : ''}${webEnvExists ? '\n  - apps/web/.env.local' : ''}`,
  );

  const action = await p.select({
    message: 'How would you like to proceed?',
    options: [
      { value: 'abort', label: 'Abort (keep existing files)' },
      { value: 'overwrite', label: 'Overwrite (regenerate fresh)' },
    ],
    initialValue: 'abort',
  });

  if (p.isCancel(action) || action === 'abort') {
    p.cancel('Installation aborted. Existing env files were not touched.');
    process.exit(0);
  }
}

export async function collectAnswers(): Promise<InstallAnswers> {
  const raw = await p.group(
    {
      adminName: () =>
        p.text({
          message: 'Admin display name',
          placeholder: 'Example',
          initialValue: 'Example',
          validate: (v) => (v.trim().length === 0 ? 'Name is required' : undefined),
        }),
      adminEmail: () =>
        p.text({
          message: 'Admin email',
          placeholder: 'admin@example.com',
          initialValue: 'admin@example.com',
          validate: (v) =>
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email' : undefined,
        }),
      adminPassword: () =>
        p.password({
          message: 'Admin password (min 8 chars)',
          mask: '*',
          validate: (v) => (v.length < 8 ? 'Password must be at least 8 characters' : undefined),
        }),
      databaseUrl: () =>
        p.text({
          message: 'PostgreSQL connection URL',
          placeholder: 'postgresql://postgres:postgres@localhost:5432/meetclone',
          initialValue: 'postgresql://postgres:postgres@localhost:5432/meetclone',
          validate: (v) => (!v.startsWith('postgres') ? 'Must be a postgresql:// URL' : undefined),
        }),
      redisUrl: () =>
        p.text({
          message: 'Redis connection URL',
          placeholder: 'redis://localhost:6379',
          initialValue: 'redis://localhost:6379',
        }),
      frontendUrl: () =>
        p.text({
          message: 'Frontend URL (for CORS + email links)',
          placeholder: 'http://localhost:3000',
          initialValue: 'http://localhost:3000',
        }),
      apiUrl: () =>
        p.text({
          message: 'Public API URL',
          placeholder: 'http://localhost:3001',
          initialValue: 'http://localhost:3001',
        }),
      livekitHost: () =>
        p.text({
          message: 'LiveKit websocket URL',
          placeholder: 'ws://localhost:7880',
          initialValue: 'ws://localhost:7880',
        }),
      runMigrations: () =>
        p.confirm({
          message: 'Run Prisma migrations now? (requires Postgres running)',
          initialValue: true,
        }),
      createAdmin: () =>
        p.confirm({
          message: 'Create the admin user in the database now?',
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Installation cancelled.');
        process.exit(0);
      },
    },
  );

  return {
    adminName: abortIfCancelled(raw.adminName, 'admin name'),
    adminEmail: abortIfCancelled(raw.adminEmail, 'admin email').toLowerCase(),
    adminPassword: abortIfCancelled(raw.adminPassword, 'admin password'),
    databaseUrl: abortIfCancelled(raw.databaseUrl, 'database URL'),
    redisUrl: abortIfCancelled(raw.redisUrl, 'redis URL'),
    frontendUrl: abortIfCancelled(raw.frontendUrl, 'frontend URL'),
    apiUrl: abortIfCancelled(raw.apiUrl, 'API URL'),
    livekitHost: abortIfCancelled(raw.livekitHost, 'livekit host'),
    runMigrations: abortIfCancelled(raw.runMigrations, 'run migrations'),
    createAdmin: abortIfCancelled(raw.createAdmin, 'create admin'),
  };
}
