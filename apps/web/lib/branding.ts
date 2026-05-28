import { cache } from 'react';

import type { PublicConfigDto } from '@open-meet/types';

import { env } from '@/lib/env';

const FALLBACK: PublicConfigDto = { appName: 'Open Meet', logoUrl: null, gifsEnabled: false };

interface PublicConfigEnvelope {
  success?: boolean;
  data?: Partial<PublicConfigDto>;
}

export const getBranding = cache(async (): Promise<PublicConfigDto> => {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/config/public`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return FALLBACK;
    }

    const json = (await res.json()) as PublicConfigEnvelope;

    if (!json.success || !json.data) {
      return FALLBACK;
    }

    return {
      appName: json.data.appName ?? FALLBACK.appName,
      logoUrl: json.data.logoUrl ?? null,
      gifsEnabled: json.data.gifsEnabled ?? false,
    };
  } catch {
    return FALLBACK;
  }
});
