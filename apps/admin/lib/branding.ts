import { cache } from 'react';

import type { PublicConfigDto } from '@open-meet/types';

import { env } from '@/lib/env';

const BRANDING_REVALIDATE_SECONDS = 60;

const FALLBACK: PublicConfigDto = {
  appName: 'Open Meet',
  logoUrl: null,
  gifsEnabled: false,
  accentColor: 'indigo',
};

interface PublicConfigEnvelope {
  success?: boolean;
  data?: Partial<PublicConfigDto>;
}

/**
 * Server-side fetch of the public branding (app name + logo) so the admin shell
 * renders the correct name/logo on first paint — no client-fetch flicker on
 * refresh. Falls back to defaults if the API is unreachable.
 */
export const getBranding = cache(async (): Promise<PublicConfigDto> => {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/config/public`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: BRANDING_REVALIDATE_SECONDS },
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
      accentColor: json.data.accentColor ?? FALLBACK.accentColor,
    };
  } catch {
    return FALLBACK;
  }
});
