'use client';

import { AtSign, Bookmark, History, MessageSquare, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Logo } from '@open-meet/ui/logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@open-meet/ui/tooltip';

import { useBranding } from '@/components/web/branding/branding-provider';
import { ChatNavBadge } from '@/features/web/chat/components/chat-nav-badge';
import { Link, usePathname } from '@/i18n/navigation';

import { isRailActive } from './rail-active';
import { getSidebarCollapsedNavItemClass } from './sidebar-item-styles';
import { UserMenu } from './user-menu';

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  key: 'chat' | 'meet' | 'activity' | 'saved' | 'history';
  badge?: boolean;
}

const ITEMS: SidebarItem[] = [
  { href: '/chat', icon: MessageSquare, key: 'chat', badge: true },
  { href: '/meet', icon: Video, key: 'meet' },
  { href: '/activity', icon: AtSign, key: 'activity' },
  { href: '/saved', icon: Bookmark, key: 'saved' },
  { href: '/history', icon: History, key: 'history' },
];

export function Sidebar() {
  return (
    <aside
      data-testid="app-sidebar"
      className="flex h-dvh w-[4.75rem] shrink-0 border-e border-border/70 bg-card/85 backdrop-blur-2xl"
    >
      <SidebarSurface />
    </aside>
  );
}

function SidebarSurface() {
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const { appName, logoUrl } = useBranding();

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-center border-b border-border/70 px-2">
          <Link
            href="/chat"
            aria-label={appName}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-transparent outline-none transition-colors hover:border-border/80 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-8 w-8 rounded-xl object-contain" />
            ) : (
              <Logo className="h-8 w-8 rounded-xl shadow-sm" title={appName} />
            )}
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-2 py-3">
          <nav aria-label={tNav('rail.label')} className="flex flex-col items-center gap-2">
            {ITEMS.map(({ href, icon: Icon, key, badge }) => {
              const active = isRailActive(pathname, href);

              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      aria-label={tNav(`rail.${key}`)}
                      aria-current={active ? 'page' : undefined}
                      className={getSidebarCollapsedNavItemClass(active)}
                    >
                      <Icon className="h-4 w-4" />
                      {badge ? <ChatNavBadge /> : null}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{tNav(`rail.${key}`)}</TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border/70 px-2 py-3">
          <div className="flex justify-center">
            <UserMenu appearance="sidebar" collapsed />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
