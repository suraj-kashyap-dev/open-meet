import type { Seeder } from '../seeder.types';
import { userSeeder } from './user.seeder';

/** All seeders, in run order. Register new seeders here. */
export const seeders: Seeder[] = [userSeeder];
