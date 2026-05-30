'use client';

import { AtSign, Bookmark, MessageSquare, Search, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCommandPalette } from '@/components/shared/command-palette-store';
import { PresenceStatusPicker } from '@/features/web/chat/components/presence-status-picker';
import { usePathname } from '@/i18n/navigation';

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
    return { icon: Bookmark, title: tChat('saved.title'), subtitle: tChat('saved.subtitle') };
  }

  return null;
}

export function TopBar() {
  const t = useTranslations('nav');
  const setOpen = useCommandPalette((s) => s.setOpen);
  const pathname = usePathname();
  const page = usePageInfo(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
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

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('search-placeholder')}
        className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:w-64"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{t('search-placeholder')}</span>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <PresenceStatusPicker />
        <UserMenu />
      </div>
    </header>
  );
}
