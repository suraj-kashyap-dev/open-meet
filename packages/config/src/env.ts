import { z } from 'zod';

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('7d'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  ADMIN_JWT_ACCESS_SECRET: z.string().min(16),
  ADMIN_JWT_ACCESS_EXPIRY: z.string().default('2h'),

  DEFAULT_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default('admin12345'),
  DEFAULT_ADMIN_NAME: z.string().min(1).default('Example'),

  LOCAL_STORAGE_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(25 * 1024 * 1024),
  API_PUBLIC_URL: z.string().url().default('http://localhost:3001'),

  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  LIVEKIT_HOST: z.string().min(1),

  RECORDING_EGRESS_FILEPATH_PREFIX: z.string().default('/out'),
  RECORDING_STORAGE_SUBDIR: z.string().default('recordings'),
  RECORDING_LAYOUT: z.string().default('grid'),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:3001/api/auth/google/callback'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
  MAIL_FROM: z.string().default('open-meet <noreply@open-meet.local>'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const webPublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_WS_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1).default('ws://localhost:7880'),
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
});

export type WebPublicEnv = z.infer<typeof webPublicEnvSchema>;

export function parseApiEnv(env: Record<string, string | undefined>): ApiEnv {
  const result = apiEnvSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    throw new Error(`Invalid API environment variables:\n${issues}`);
  }

  return result.data;
}

export function parseWebPublicEnv(env: Record<string, string | undefined>): WebPublicEnv {
  const result = webPublicEnvSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    throw new Error(`Invalid web public environment variables:\n${issues}`);
  }

  return result.data;
}
