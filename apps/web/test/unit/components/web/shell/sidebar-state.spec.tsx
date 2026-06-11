import { act, renderHook } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellSidebarProvider, useShellSidebar } from '@/components/web/shell/sidebar-state';

const STORAGE_KEY = 'open-meet:web-shell-sidebar-expanded';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

function AssertCollapsedFromStorage() {
  const { desktopExpanded } = useShellSidebar();

  if (desktopExpanded) {
    throw new Error('expected the sidebar to initialize from persisted collapsed state');
  }

  return null;
}

describe('ShellSidebarProvider', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    container = document.createElement('div');

    document.body.appendChild(container);

    window.localStorage.clear();

    mockMatchMedia(true);
  });

  afterEach(() => {
    root?.unmount();

    container.remove();

    vi.unstubAllGlobals();
  });

  it('should use the persisted desktop state on the first client render', () => {
    window.localStorage.setItem(STORAGE_KEY, '0');

    root = createRoot(container);

    expect(() => {
      flushSync(() => {
        root?.render(
          <ShellSidebarProvider>
            <AssertCollapsedFromStorage />
          </ShellSidebarProvider>,
        );
      });
    }).not.toThrow();
  });

  it('should toggle and persist the desktop expanded state', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useShellSidebar(), { wrapper: ShellSidebarProvider });

    expect(result.current.isDesktop).toBe(true);

    expect(result.current.desktopExpanded).toBe(true);

    act(() => result.current.toggleSidebar());

    expect(result.current.desktopExpanded).toBe(false);

    expect(result.current.mobileOpen).toBe(false);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('0');

    act(() => result.current.openSidebar());

    expect(result.current.desktopExpanded).toBe(true);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('should toggle the mobile overlay without changing the desktop state', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useShellSidebar(), { wrapper: ShellSidebarProvider });

    expect(result.current.isDesktop).toBe(false);

    expect(result.current.mobileOpen).toBe(false);

    act(() => result.current.toggleSidebar());

    expect(result.current.mobileOpen).toBe(true);

    expect(result.current.desktopExpanded).toBe(true);

    act(() => result.current.closeSidebar());

    expect(result.current.mobileOpen).toBe(false);
  });
});
