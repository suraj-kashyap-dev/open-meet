'use client';

import type { AdminBrandingDto, PublicConfigDto } from '@open-meet/types';
import type { ReactNode } from 'react';

import { useAdminBranding } from '@/features/branding/hooks/use-admin-branding';

import { AccentProvider } from './accent-provider';
import { BrandingProvider } from './provider';

function toAdminBranding(initialBranding: PublicConfigDto): AdminBrandingDto {
  return {
    appName: initialBranding.appName,
    logoUrl: initialBranding.logoUrl,
    accentColor: initialBranding.accentColor,
  };
}

export function AdminBrandingProvider({
  initialBranding,
  children,
}: {
  initialBranding: PublicConfigDto;
  children: ReactNode;
}) {
  const { data } = useAdminBranding({
    enabled: false,
    initialData: toAdminBranding(initialBranding),
  });

  return (
    <BrandingProvider
      value={{
        ...initialBranding,
        appName: data?.appName ?? initialBranding.appName,
        logoUrl: data?.logoUrl ?? initialBranding.logoUrl,
        accentColor: data?.accentColor ?? initialBranding.accentColor,
      }}
    >
      <AccentProvider>{children}</AccentProvider>
    </BrandingProvider>
  );
}
