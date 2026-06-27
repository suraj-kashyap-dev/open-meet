'use client';

import { AtSign, MessageSquare, PanelLeft, Star, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActivityIndicator } from '@open-meet/ui/activity-indicator';

import { PresenceStatusPicker } from '@/features/web/chat/components/presence-status-picker';
import { usePathname } from '@/i18n/navigation';

import { useShellSidebar } from './sidebar-state';
import { UserMenu } from './user-menu';

interface PageInfo {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

function usePageInfo(pathname: string): PageInfo | null {
  const tChat = useTranslations('chat');
  const tHome = useTranslations('home');

  if (pathname === '/chat' || pathname.startsWith('/chat/')) {
    return {
      icon: MessageSquare,
      title: tChat('list.title'),
      subtitle: tChat('list.subtitle'),
    };
  }

  if (pathname === '/meet' || pathname.startsWith('/meet/')) {
    return { icon: Video, title: tHome('page.title'), subtitle: tHome('page.subtitle') };
  }

  if (pathname === '/activity' || pathname.startsWith('/activity/')) {
    return {
      icon: AtSign,
      title: tChat('activity.title'),
      subtitle: tChat('activity.subtitle'),
    };
  }

  if (pathname === '/saved' || pathname.startsWith('/saved/')) {
    return { icon: Star, title: tChat('saved.title'), subtitle: tChat('saved.subtitle') };
  }

  return null;
}

export function TopBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const page = usePageInfo(pathname);
  const { isDesktop, desktopExpanded, mobileOpen, openSidebar } = useShellSidebar();

  const sidebarVisible = isDesktop ? desktopExpanded : mobileOpen;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
      {isDesktop && !sidebarVisible ? (
        <button
          type="button"
          onClick={openSidebar}
          aria-label={t('rail.show')}
          aria-expanded={false}
          data-testid="sidebar-toggle"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      ) : null}

      {page ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
            <page.icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">{page.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{page.subtitle}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        <ActivityIndicator />
        <PresenceStatusPicker />
        <UserMenu appearance="icon" className="ms-1" />
      </div>
    </header>
  );
}
