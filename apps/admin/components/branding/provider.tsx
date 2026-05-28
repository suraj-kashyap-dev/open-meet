'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { PublicConfigDto } from '@open-meet/types';

const FALLBACK: PublicConfigDto = { appName: 'Open Meet', logoUrl: null, gifsEnabled: false };

const BrandingContext = createContext<PublicConfigDto>(FALLBACK);

export function BrandingProvider({
  value,
  children,
}: {
  value: PublicConfigDto;
  children: ReactNode;
}) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding(): PublicConfigDto {
  return useContext(BrandingContext);
}
