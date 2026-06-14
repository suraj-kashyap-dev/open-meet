import * as argon2 from 'argon2';

import { SEED_PASSWORD, USER_ROSTER_SIZE, makeUser } from '@/database/factories';
import type { Seeder } from '@/database/seeders/seeder.types';

export const userSeeder: Seeder = {
  name: 'users',

  async run(prisma): Promise<string> {
    const passwordHash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < USER_ROSTER_SIZE; i += 1) {
      const data = makeUser(i, passwordHash);
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.user.create({ data });

      created += 1;
    }

    const note = created > 0 ? ` Login with any seeded email + password "${SEED_PASSWORD}".` : '';

    return `${created} created, ${skipped} skipped (already existed).${note}`;
  },
};
