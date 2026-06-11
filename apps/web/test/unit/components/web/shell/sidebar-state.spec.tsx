import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellSidebarProvider, useShellSidebar } from '@/components/web/shell/sidebar-state';

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

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    root?.unmount();

    container.remove();

    vi.unstubAllGlobals();
  });

  it('should use the persisted desktop state on the first client render', () => {
    window.localStorage.setItem('open-meet:web-shell-sidebar-expanded', '0');

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
});
