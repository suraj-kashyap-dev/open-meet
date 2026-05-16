import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';

export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface RenderProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

interface RenderResultWithUser extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
  queryClient: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient = makeTestQueryClient(), ...rest }: RenderProvidersOptions = {},
): RenderResultWithUser {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const result = render(ui, { wrapper: Wrapper, ...rest });

  return {
    ...result,
    user: userEvent.setup(),
    queryClient,
  };
}

export * from '@testing-library/react';
export { userEvent };
