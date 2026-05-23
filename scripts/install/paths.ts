import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..', '..');

export const SERVER_ENV = path.join(ROOT, 'apps/server/.env');
export const SERVER_ENV_EXAMPLE = path.join(ROOT, 'apps/server/.env.example');
export const WEB_ENV = path.join(ROOT, 'apps/web/.env.local');
export const WEB_ENV_EXAMPLE = path.join(ROOT, 'apps/web/.env.example');
export const LIVEKIT_YAML = path.join(ROOT, 'docker/livekit.yaml');
export const EGRESS_YAML = path.join(ROOT, 'docker/egress.yaml');
