import {
  BarChart3,
  CalendarRange,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  ShieldCheck,
  Users,
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
  children?: NavChild[];
}

export interface NavSection {
  labelKey: string;
  items: NavItem[];
}

export const nav: NavSection[] = [
  {
    labelKey: 'sections.overview',
    items: [{ labelKey: 'items.dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    labelKey: 'sections.manage',
    items: [
      { labelKey: 'items.users', href: '/users', icon: Users, permission: 'users.view' },
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
        labelKey: 'items.administrators',
        href: '/administrators',
        icon: ShieldCheck,
        permission: 'admin-accounts.view',
      },
      { labelKey: 'items.roles', href: '/roles', icon: KeyRound, permission: 'roles.view' },
      {
        labelKey: 'items.user-roles',
        href: '/user-roles',
        icon: KeyRound,
        permission: 'user-roles.view',
      },
      { labelKey: 'items.settings', href: '/settings', icon: Settings },
    ],
  },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
