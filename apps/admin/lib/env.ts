import { parseWebPublicEnv, type WebPublicEnv } from '@open-meet/config';

export const env: WebPublicEnv = parseWebPublicEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
});
