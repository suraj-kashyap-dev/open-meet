import { z } from 'zod';

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  LIVEKIT_HOST: z.string().min(1),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const webPublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_WS_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1).default('ws://localhost:7880'),
});

export type WebPublicEnv = z.infer<typeof webPublicEnvSchema>;

export function parseApiEnv(env: NodeJS.ProcessEnv | Record<string, string | undefined>): ApiEnv {
  const result = apiEnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid API environment variables:\n${issues}`);
  }
  return result.data;
}

export function parseWebPublicEnv(
  env: Record<string, string | undefined>,
): WebPublicEnv {
  const result = webPublicEnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid web public environment variables:\n${issues}`);
  }
  return result.data;
}
