import {
  BarChart3,
  CalendarRange,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { AdminPermissionKey } from '@open-meet/types';

export interface NavChild {
  labelKey: string;
  href: string;
  permission?: AdminPermissionKey;
}

export interface NavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  permission?: AdminPermissionKey;
  activeFor?: string[];
  children?: NavChild[];
}

export interface NavSection {
  labelKey: string;
  items: NavItem[];
}

export interface SettingsHubRoute {
  href: string;
  labelKey: string;
}

export const SETTINGS_HUB_ROUTES: SettingsHubRoute[] = [
  { href: '/administrators', labelKey: 'items.administrators' },
  { href: '/roles', labelKey: 'items.roles' },
  { href: '/settings/branding', labelKey: 'items.branding' },
  { href: '/settings/configuration', labelKey: 'items.configuration' },
];

export function matchSettingsHubRoute(pathname: string): SettingsHubRoute | null {
  for (const route of SETTINGS_HUB_ROUTES) {
    if (pathname === route.href || pathname.startsWith(`${route.href}/`)) {
      return route;
    }
  }

  return null;
}

export const nav: NavSection[] = [
  {
    labelKey: 'sections.overview',
    items: [
      { labelKey: 'items.dashboard', href: '/', icon: LayoutDashboard },
      {
        labelKey: 'items.analytics',
        href: '/analytics',
        icon: BarChart3,
        permission: 'analytics.view',
      },
    ],
  },
  {
    labelKey: 'sections.manage',
    items: [
      { labelKey: 'items.users', href: '/users', icon: Users, permission: 'users.view' },
      {
        labelKey: 'items.groups',
        href: '/groups',
        icon: MessagesSquare,
        permission: 'groups.view',
      },
      {
        labelKey: 'items.meetings',
        href: '/meetings',
        icon: CalendarRange,
        permission: 'meetings.view',
      },
    ],
  },
  {
    labelKey: 'sections.system',
    items: [
      {
        labelKey: 'items.settings',
        href: '/settings',
        icon: Settings,
        activeFor: SETTINGS_HUB_ROUTES.map((r) => r.href),
      },
    ],
  },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isItemActive(pathname: string, item: NavItem): boolean {
  if (isActive(pathname, item.href)) {
    return true;
  }

  return (item.activeFor ?? []).some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}
