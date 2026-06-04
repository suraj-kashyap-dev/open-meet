'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'open-meet:web-shell-sidebar-expanded';
const DESKTOP_QUERY = '(min-width: 1024px)';

function readDesktopExpanded(fallback: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  return stored === '0' || stored === '1' ? stored === '1' : fallback;
}

interface ShellSidebarContextValue {
  desktopExpanded: boolean;
  isDesktop: boolean;
  mobileOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setDesktopExpanded: (open: boolean) => void;
  setMobileOpen: (open: boolean) => void;
}

const ShellSidebarContext = createContext<ShellSidebarContextValue | null>(null);

export function ShellSidebarProvider({ children }: { children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true);
  const [desktopExpanded, setDesktopExpandedState] = useState(() => readDesktopExpanded(true));
  const [mobileOpen, setMobileOpenState] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(DESKTOP_QUERY);

    const syncViewport = () => {
      setIsDesktop(media.matches);
      if (media.matches) {
        setMobileOpenState(false);
      }
    };

    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, desktopExpanded ? '1' : '0');
  }, [desktopExpanded]);

  const setDesktopExpanded = (open: boolean) => setDesktopExpandedState(open);
  const setMobileOpen = (open: boolean) => setMobileOpenState(open);

  const openSidebar = () => {
    if (isDesktop) {
      setDesktopExpandedState(true);
      return;
    }

    setMobileOpenState(true);
  };

  const closeSidebar = () => {
    if (isDesktop) {
      setDesktopExpandedState(false);
      return;
    }

    setMobileOpenState(false);
  };

  const toggleSidebar = () => {
    if (isDesktop) {
      setDesktopExpandedState((current) => !current);
      return;
    }

    setMobileOpenState((current) => !current);
  };

  return (
    <ShellSidebarContext.Provider
      value={{
        desktopExpanded,
        isDesktop,
        mobileOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        setDesktopExpanded,
        setMobileOpen,
      }}
    >
      {children}
    </ShellSidebarContext.Provider>
  );
}

export function useShellSidebar() {
  const value = useContext(ShellSidebarContext);

  if (!value) {
    throw new Error('useShellSidebar must be used within a ShellSidebarProvider');
  }

  return value;
}
