'use client';

import { AtSign, Bookmark, History, MessageSquare, PanelLeftClose, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@open-meet/ui/tooltip';

import { AppLogo } from '@/components/web/branding/app-logo';
import { useBranding } from '@/components/web/branding/branding-provider';
import { ChatNavBadge } from '@/features/web/chat/components/chat-nav-badge';
import { Link, usePathname } from '@/i18n/navigation';

import { cn } from '@open-meet/ui/cn';

import { isRailActive } from './rail-active';
import { useShellSidebar } from './sidebar-state';
import {
  getSidebarCollapsedNavItemClass,
  getSidebarNavIconClass,
  getSidebarNavItemClass,
  getSidebarNavLabelClass,
} from './sidebar-item-styles';

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
  const tNav = useTranslations('nav');
  const { isDesktop, desktopExpanded, mobileOpen, closeSidebar } = useShellSidebar();

  const visible = isDesktop ? desktopExpanded : mobileOpen;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label={tNav('rail.backdrop')}
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
        />
      ) : null}

      <aside
        data-testid="app-sidebar"
        data-visible={visible ? 'true' : 'false'}
        aria-hidden={visible ? undefined : true}
        inert={visible ? undefined : true}
        className={cn(
          'flex h-dvh w-64 border-border/70 bg-card/85 backdrop-blur-2xl',
          // Mobile: fixed slide-in drawer driven by mobileOpen.
          'fixed inset-y-0 start-0 z-40 border-e shadow-2xl transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
          // Desktop (lg+): docked in-flow rail that collapses to zero width.
          'lg:static lg:z-auto lg:translate-x-0 lg:rtl:translate-x-0 lg:shrink-0 lg:overflow-hidden lg:shadow-none lg:transition-[width] lg:duration-200',
          desktopExpanded ? 'lg:w-[4.75rem] lg:border-e' : 'lg:w-0 lg:border-e-0',
        )}
      >
        <SidebarSurface />
      </aside>
    </>
  );
}

function SidebarSurface() {
  const { isDesktop } = useShellSidebar();

  return isDesktop ? <CollapsedRail /> : <ExpandedDrawer />;
}

function SidebarLogo() {
  const { appName, logoUrl } = useBranding();

  return logoUrl ? (
    <img src={logoUrl} alt={appName} className="h-8 w-8 rounded-xl object-contain" />
  ) : (
    <AppLogo className="h-8 w-8 rounded-xl shadow-sm" title={appName} />
  );
}

function CollapsedRail() {
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const { appName } = useBranding();
  const { closeSidebar } = useShellSidebar();

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="group relative flex h-14 items-center justify-center border-b border-border/70 px-2">
          <Link
            href="/chat"
            aria-label={appName}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-transparent outline-none transition-opacity hover:border-border/80 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-0 group-focus-within:opacity-0"
          >
            <SidebarLogo />
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label={tNav('rail.hide')}
            data-testid="sidebar-hide"
            className="pointer-events-none absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-muted-foreground opacity-0 outline-none transition-opacity hover:border-border/80 hover:text-foreground focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-ring group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
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
      </div>
    </TooltipProvider>
  );
}

function ExpandedDrawer() {
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const { appName } = useBranding();
  const { closeSidebar } = useShellSidebar();

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-14 items-center gap-3 border-b border-border/70 px-3">
        <Link
          href="/chat"
          aria-label={appName}
          className="flex min-w-0 items-center gap-2.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SidebarLogo />
          <span className="truncate text-sm font-semibold">{appName}</span>
        </Link>
        <button
          type="button"
          onClick={closeSidebar}
          aria-label={tNav('rail.hide')}
          className="ms-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-muted-foreground outline-none transition-colors hover:border-border/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
        <nav aria-label={tNav('rail.label')} className="flex flex-col gap-1">
          {ITEMS.map(({ href, icon: Icon, key, badge }) => {
            const active = isRailActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={closeSidebar}
                className={getSidebarNavItemClass(active)}
              >
                <span className={getSidebarNavIconClass(active)}>
                  <Icon className="h-4 w-4" />
                  {badge ? <ChatNavBadge /> : null}
                </span>
                <span className={getSidebarNavLabelClass(active)}>{tNav(`rail.${key}`)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
