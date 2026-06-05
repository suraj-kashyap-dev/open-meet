import type { MetadataRoute } from 'next';

import { getBranding } from '@/lib/branding';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { appName } = await getBranding();

  return {
    name: appName,
    short_name: appName,
    description: 'Real-time video conferencing and team chat.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
