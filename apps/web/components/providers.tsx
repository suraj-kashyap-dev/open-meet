'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';

import { UnauthorizedBridge } from '@/components/auth/unauthorized-bridge';
import { TopProgress } from '@/components/ui/top-progress';
import { useAuthBootstrap } from '@/hooks/use-auth';

function AuthBootstrap() {
  useAuthBootstrap();
  return null;
}

/**
 * Marks the document as hydrated once React has committed its first effect.
 * Lets Playwright (and our own JS-dependent affordances) wait reliably for
 * the page to be interactive instead of guessing with `networkidle`.
 */
function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true';
    return () => {
      delete document.documentElement.dataset.hydrated;
    };
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
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
        <HydrationMarker />
        <AuthBootstrap />
        <UnauthorizedBridge />
        <TopProgress />
        {children}
        {process.env.NODE_ENV === 'development' ? (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        ) : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
