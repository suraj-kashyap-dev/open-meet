import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { SERVER_ENV, SERVER_ENV_EXAMPLE, WEB_ENV, WEB_ENV_EXAMPLE } from './paths.js';
import type { InstallAnswers } from './prompts.js';
import type { GeneratedSecrets } from './secrets.js';

function setEnvVar(content: string, key: string, value: string): string {
  const re = new RegExp(`^${key}=.*$`, 'm');

  if (re.test(content)) {
    return content.replace(re, `${key}=${value}`);
  }

  return content.endsWith('\n') ? `${content}${key}=${value}\n` : `${content}\n${key}=${value}\n`;
}

export async function writeServerEnv(
  answers: InstallAnswers,
  secrets: GeneratedSecrets,
): Promise<void> {
  let content = await readFile(SERVER_ENV_EXAMPLE, 'utf8');

  content = setEnvVar(content, 'DATABASE_URL', answers.databaseUrl);
  content = setEnvVar(content, 'REDIS_URL', answers.redisUrl);
  content = setEnvVar(content, 'JWT_ACCESS_SECRET', secrets.JWT_ACCESS_SECRET);
  content = setEnvVar(content, 'JWT_REFRESH_SECRET', secrets.JWT_REFRESH_SECRET);
  content = setEnvVar(content, 'ADMIN_JWT_ACCESS_SECRET', secrets.ADMIN_JWT_ACCESS_SECRET);
  content = setEnvVar(content, 'DEFAULT_ADMIN_EMAIL', answers.adminEmail);
  content = setEnvVar(content, 'DEFAULT_ADMIN_PASSWORD', answers.adminPassword);
  content = setEnvVar(content, 'DEFAULT_ADMIN_NAME', answers.adminName);
  content = setEnvVar(content, 'LIVEKIT_API_KEY', secrets.LIVEKIT_API_KEY);
  content = setEnvVar(content, 'LIVEKIT_API_SECRET', secrets.LIVEKIT_API_SECRET);
  content = setEnvVar(content, 'LIVEKIT_HOST', answers.livekitHost);
  content = setEnvVar(content, 'FRONTEND_URL', answers.frontendUrl);
  content = setEnvVar(content, 'API_PUBLIC_URL', answers.apiUrl);

  await mkdir(path.dirname(SERVER_ENV), { recursive: true });
  await writeFile(SERVER_ENV, content);
}

export async function writeWebEnv(answers: InstallAnswers): Promise<void> {
  let content = await readFile(WEB_ENV_EXAMPLE, 'utf8');

  content = setEnvVar(content, 'NEXT_PUBLIC_API_URL', answers.apiUrl);
  content = setEnvVar(content, 'NEXT_PUBLIC_WS_URL', answers.apiUrl);
  content = setEnvVar(content, 'NEXT_PUBLIC_LIVEKIT_URL', answers.livekitHost);

  await mkdir(path.dirname(WEB_ENV), { recursive: true });
  await writeFile(WEB_ENV, content);
}
