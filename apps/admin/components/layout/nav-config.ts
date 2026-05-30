import {
  BarChart3,
  CalendarRange,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

import type { AdminPermissionKey } from '@open-meet/types';

export interface NavChild {
  labelKey: string;
  href: string;
  /** Optional RBAC gate — hide the child when the current admin can't access it. */
  permission?: AdminPermissionKey;
}

export interface NavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  /** Optional RBAC gate — hide the item when the current admin can't access it. */
  permission?: AdminPermissionKey;
  /**
   * Extra route prefixes that should keep this nav item highlighted. Used for
   * "virtual children" — surfaces that live at a top-level URL but conceptually
   * belong under this item (see {@link SETTINGS_HUB_ROUTES}).
   */
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

/**
 * Routes that live in the Settings hub but render at a top-level URL. The
 * sidebar uses these to keep the "Settings" item highlighted while you're on
 * one of them, and the topbar uses them to build a proper breadcrumb chain
 * (Admin / Settings / <route>). Order matches the hub's reading order.
 */
export const SETTINGS_HUB_ROUTES: SettingsHubRoute[] = [
  { href: '/administrators', labelKey: 'items.administrators' },
  { href: '/roles', labelKey: 'items.roles' },
  { href: '/users', labelKey: 'items.users' },
  { href: '/user-roles', labelKey: 'items.user-roles' },
  { href: '/settings/branding', labelKey: 'items.branding' },
  { href: '/settings/configuration', labelKey: 'items.configuration' },
];

/**
 * Return the matching Settings-hub route (if any) for a pathname. Matches both
 * the exact href and any deeper child path (e.g. `/roles/new` matches `/roles`).
 */
export function matchSettingsHubRoute(pathname: string): SettingsHubRoute | null {
  for (const route of SETTINGS_HUB_ROUTES) {
    if (pathname === route.href || pathname.startsWith(`${route.href}/`)) return route;
  }
  return null;
}

/**
 * The sidebar groups day-to-day workspace nav into three sections. Administrative
 * surfaces (users, administrators, admin roles, user roles, branding,
 * configuration) live inside the Settings hub instead of the sidebar — see
 * `apps/admin/components/settings/settings-hub.tsx`. Settings stays in the
 * sidebar as the single entry point for all of them.
 */
export const nav: NavSection[] = [
  {
    labelKey: 'sections.overview',
    items: [{ labelKey: 'items.dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    labelKey: 'sections.manage',
    items: [
      { labelKey: 'items.teams', href: '/teams', icon: UsersRound, permission: 'teams.view' },
      { labelKey: 'items.groups', href: '/groups', icon: MessagesSquare, permission: 'groups.view' },
      {
        labelKey: 'items.meetings',
        href: '/meetings',
        icon: CalendarRange,
        permission: 'meetings.view',
      },
    ],
  },
  {
    labelKey: 'sections.insights',
    items: [
      {
        labelKey: 'items.analytics',
        href: '/analytics',
        icon: BarChart3,
        permission: 'analytics.view',
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

/**
 * Same as {@link isActive} but also honours an item's `activeFor` prefixes —
 * used by the sidebar so virtual Settings-hub children keep the Settings item
 * highlighted.
 */
export function isItemActive(pathname: string, item: NavItem): boolean {
  if (isActive(pathname, item.href)) return true;
  return (item.activeFor ?? []).some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}
