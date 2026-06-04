'use client';

import { ChevronRight, ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Logo } from '@open-meet/ui/logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@open-meet/ui/tooltip';
import { cn } from '@open-meet/ui/cn';

import { Link, usePathname } from '@/i18n/navigation';
import { isRtl } from '@/i18n/routing';
import { env } from '@/lib/env';
import { useBranding } from '@/components/branding/provider';
import { useCurrentAdminMe } from '@/features/auth/hooks/use-admin-auth';

import { nav, isActive, isItemActive, type NavItem, type NavSection } from './nav-config';

interface Props {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function SidebarContent({ onNavigate, collapsed = false }: Props) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tooltipSide = isRtl(useLocale()) ? 'left' : 'right';
  const { appName, logoUrl } = useBranding();
  const { data: me } = useCurrentAdminMe();
  const visibleNav = filterNav(nav, me);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col bg-card">
        <div
          className={cn(
            'flex h-14 items-center border-b border-border',
            collapsed ? 'justify-center px-2' : 'px-4',
          )}
        >
          <Link
            href="/"
            onClick={onNavigate}
            aria-label={appName}
            className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={appName}
                className="h-8 w-8 shrink-0 rounded-md object-contain"
              />
            ) : (
              <Logo className="h-8 w-8 shrink-0" />
            )}
            {!collapsed ? (
              <span className="flex min-w-0 flex-col leading-none">
                <span className="truncate text-sm font-semibold tracking-tight">{appName}</span>
                <span className="truncate pt-1 text-[11px] font-medium text-muted-foreground">
                  {t('brand.console')}
                </span>
              </span>
            ) : null}
          </Link>
        </div>

        <nav
          className={cn(
            'flex-1 overflow-y-auto py-5',
            collapsed ? 'space-y-2 px-2' : 'space-y-6 px-3',
          )}
        >
          {visibleNav.map((section, sectionIndex) => (
            <div key={section.labelKey} className="space-y-1">
              {collapsed ? (
                sectionIndex > 0 ? (
                  <div className="mx-auto my-2 h-px w-6 bg-border" />
                ) : null
              ) : (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {t(section.labelKey)}
                </p>
              )}

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(pathname, item);
                  const hasChildren = Boolean(item.children?.length);
                  const label = t(item.labelKey);

                  if (collapsed) {
                    const trigger = item.disabled ? (
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground/50"
                        aria-disabled
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-label={label}
                        aria-current={active && !hasChildren ? 'page' : undefined}
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent',
                          active
                            ? 'bg-accent text-accent-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </Link>
                    );

                    return (
                      <li key={item.href} className="flex justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
                          <TooltipContent side={tooltipSide}>{label}</TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  const badge = item.badge ? (
                    <span
                      className={cn(
                        'ms-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        active && !hasChildren
                          ? 'bg-accent-foreground/20 text-accent-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null;

                  if (item.disabled) {
                    return (
                      <li key={item.href}>
                        <span
                          className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
                          aria-disabled
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="truncate">{label}</span>
                          {badge}
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active && !hasChildren ? 'page' : undefined}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent',
                          hasChildren
                            ? active
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            : active
                              ? 'bg-accent text-accent-foreground shadow-sm'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-[18px] w-[18px] shrink-0 transition-colors',
                            active && !hasChildren
                              ? 'text-accent-foreground'
                              : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        />
                        <span className="truncate">{label}</span>
                        {badge}
                        {hasChildren ? (
                          <ChevronRight
                            className={cn(
                              'ms-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform rtl:-scale-x-100',
                              active && 'rotate-90',
                            )}
                          />
                        ) : null}
                      </Link>

                      {hasChildren && active ? (
                        <ul className="ms-[1.6rem] mt-1 space-y-1 border-s border-border ps-3">
                          {item.children!.map((child) => {
                            const childActive = isActive(pathname, child.href);

                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={onNavigate}
                                  aria-current={childActive ? 'page' : undefined}
                                  className={cn(
                                    'block rounded-lg px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent',
                                    childActive
                                      ? 'bg-muted font-medium text-foreground'
                                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                  )}
                                >
                                  {t(child.labelKey)}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className={cn('border-t border-border', collapsed ? 'flex justify-center p-2' : 'p-3')}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={env.NEXT_PUBLIC_WEB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onNavigate}
                  aria-label={t('brand.visit-open-meet')}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>{t('brand.visit-open-meet')}</TooltipContent>
            </Tooltip>
          ) : (
            <a
              href={env.NEXT_PUBLIC_WEB_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              {t('brand.visit-open-meet')}
            </a>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function filterNav(
  sections: NavSection[],
  me: ReturnType<typeof useCurrentAdminMe>['data'],
): NavSection[] {
  if (!me) return sections;
  const bypass = me.role?.permissionType === 'ALL';
  const granted = me.grantedSet;
  const can = (key: string | undefined): boolean => !key || bypass || granted.includes(key);

  return sections
    .map((section) => {
      const items = section.items
        .map((item: NavItem) => {
          if (!can(item.permission)) return null;
          if (!item.children?.length) return item;
          const children = item.children.filter((c) => can(c.permission));
          return { ...item, children };
        })
        .filter((item): item is NavItem => item !== null);
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}
