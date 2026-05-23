import { parseWebPublicEnv, type WebPublicEnv } from '@open-meet/config';

// The admin console only talks to the API's `/admin/*` endpoints. WS/LiveKit
// vars are irrelevant here and fall back to the schema defaults.
export const env: WebPublicEnv = parseWebPublicEnv({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
});
