import {
  BarChart3,
  CalendarRange,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavChild {
  labelKey: string;
  href: string;
}

export interface AdminNavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  children?: AdminNavChild[];
}

export interface AdminNavSection {
  labelKey: string;
  items: AdminNavItem[];
}

export const adminNav: AdminNavSection[] = [
  {
    labelKey: 'sections.overview',
    items: [{ labelKey: 'items.dashboard', href: '/', icon: LayoutDashboard }],
  },
  {
    labelKey: 'sections.manage',
    items: [
      { labelKey: 'items.users', href: '/users', icon: Users },
      { labelKey: 'items.meetings', href: '/meetings', icon: CalendarRange },
    ],
  },
  {
    labelKey: 'sections.insights',
    items: [{ labelKey: 'items.analytics', href: '/analytics', icon: BarChart3 }],
  },
  {
    labelKey: 'sections.system',
    items: [
      { labelKey: 'items.administrators', href: '/administrators', icon: ShieldCheck },
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
