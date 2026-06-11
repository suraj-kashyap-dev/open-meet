import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.NODE_ENV = 'test';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/openmeet_test';

process.env.REDIS_URL ??= 'redis://localhost:6379';

process.env.JWT_ACCESS_SECRET ??= 'e2e-access-secret-please-change-0123456789';

process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret-please-change-0123456789';

process.env.ADMIN_JWT_ACCESS_SECRET ??= 'e2e-admin-secret-please-change-0123456789';

process.env.LIVEKIT_API_KEY ??= 'devkey';

process.env.LIVEKIT_API_SECRET ??= 'secret';

process.env.LIVEKIT_HOST ??= 'ws://localhost:7880';

process.env.API_PUBLIC_URL ??= 'http://localhost:3002';

process.env.FRONTEND_URL ??= 'http://localhost:3000';

process.env.LOCAL_STORAGE_DIR ??= join(tmpdir(), 'openmeet-e2e-uploads');

process.env.VAPID_PUBLIC_KEY = '';

process.env.VAPID_PRIVATE_KEY = '';
