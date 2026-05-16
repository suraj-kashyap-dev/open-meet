import { vi } from 'vitest';

export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export function installNextNavigationMock() {
  vi.mock('next/navigation', () => ({
    useRouter: () => routerMock,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    redirect: vi.fn(),
    notFound: vi.fn(),
  }));
}

export function resetNextRouterMock() {
  routerMock.push.mockReset();
  routerMock.replace.mockReset();
  routerMock.back.mockReset();
  routerMock.forward.mockReset();
  routerMock.refresh.mockReset();
  routerMock.prefetch.mockReset();
}
