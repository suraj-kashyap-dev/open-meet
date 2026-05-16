import { parseApiEnv, type ApiEnv } from '@open-meet/config';

export function envValidate(config: Record<string, unknown>): ApiEnv {
  return parseApiEnv(config as Record<string, string | undefined>);
}

export type { ApiEnv };
