import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { describe, expect, it } from 'vitest';

import { AdminBrandingProvider } from '@/components/branding/admin-branding-provider';
import { useBranding } from '@/components/branding/provider';

function BrandingProbe() {
  const branding = useBranding();

  return (
    <>
      <div data-testid="app-name">{branding.appName}</div>
      <div data-testid="accent-color">{branding.accentColor}</div>
    </>
  );
}

describe('<AdminBrandingProvider />', () => {
  it('should reflect admin branding query updates without a page refresh', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <AdminBrandingProvider
            initialBranding={{
              appName: 'Acme Meet',
              logoUrl: null,
              gifsEnabled: false,
              accentColor: 'indigo',
            }}
          >
            <BrandingProbe />
          </AdminBrandingProvider>
        </QueryClientProvider>
      </ThemeProvider>,
    );

    expect(screen.getByTestId('app-name')).toHaveTextContent('Acme Meet');

    expect(screen.getByTestId('accent-color')).toHaveTextContent('indigo');

    act(() => {
      queryClient.setQueryData(['admin-branding'], {
        appName: 'Orbit Meet',
        logoUrl: null,
        accentColor: 'teal',
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('app-name')).toHaveTextContent('Orbit Meet');

      expect(screen.getByTestId('accent-color')).toHaveTextContent('teal');
    });
  });
});
