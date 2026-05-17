import { randomBytes } from 'node:crypto';

export interface GeneratedSecrets {
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ADMIN_JWT_ACCESS_SECRET: string;
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
}

function genSecret(bytes = 64): string {
  return randomBytes(bytes).toString('base64url');
}

function genLivekitApiKey(): string {
  return 'API' + randomBytes(8).toString('base64url').replace(/[-_]/g, '').slice(0, 12);
}

function genLivekitApiSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function generateSecrets(): GeneratedSecrets {
  return {
    JWT_ACCESS_SECRET: genSecret(64),
    JWT_REFRESH_SECRET: genSecret(64),
    ADMIN_JWT_ACCESS_SECRET: genSecret(64),
    LIVEKIT_API_KEY: genLivekitApiKey(),
    LIVEKIT_API_SECRET: genLivekitApiSecret(),
  };
}
