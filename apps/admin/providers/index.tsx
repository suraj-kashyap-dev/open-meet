'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import type { PublicConfigDto } from '@open-meet/types';
import { useState, type ReactNode } from 'react';

import { AdminBrandingProvider } from '@/components/branding/admin-branding-provider';

import { TopProgress } from './top-progress';
import { UnauthorizedBridge } from './unauthorized-bridge';

export function Providers({
  children,
  initialBranding,
}: {
  children: ReactNode;
  initialBranding: PublicConfigDto;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <QueryClientProvider client={queryClient}>
        <UnauthorizedBridge />
        <TopProgress />
        <AdminBrandingProvider initialBranding={initialBranding}>{children}</AdminBrandingProvider>
        {process.env.APP_DEBUG == 'true' ? (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
