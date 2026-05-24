import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASE_LOCALE = 'en';

export const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

export const LANG_ROOTS = ['apps/web/lang', 'apps/admin/lang', 'apps/server/lang'] as const;
