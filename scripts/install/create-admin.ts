import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const serverRequire = createRequire(path.join(ROOT, 'apps/server/package.json'));

interface PrismaAdminClient {
  admin: {
    findUnique(args: { where: { email: string } }): Promise<{ id: string } | null>;
    create(args: {
      data: { email: string; name: string; passwordHash: string; role: 'SUPERADMIN' };
    }): Promise<unknown>;
  };
  $disconnect(): Promise<void>;
}

interface Argon2Module {
  hash(plain: string, opts: { type: number }): Promise<string>;
  argon2id: number;
}

const { PrismaClient } = serverRequire('@prisma/client') as {
  PrismaClient: new () => PrismaAdminClient;
};
const argon2 = serverRequire('argon2') as Argon2Module;

async function main(): Promise<void> {
  const email = process.env.DEFAULT_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  const name = process.env.DEFAULT_ADMIN_NAME;

  if (!email || !password || !name) {
    throw new Error(
      'DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, and DEFAULT_ADMIN_NAME must be set.',
    );
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.admin.findUnique({ where: { email } });

    if (existing) {
      process.stdout.write(`Admin ${email} already exists — leaving it unchanged.\n`);
      return;
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    await prisma.admin.create({
      data: { email, name, passwordHash, role: 'SUPERADMIN' },
    });

    process.stdout.write(`Created SUPERADMIN ${email}.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
