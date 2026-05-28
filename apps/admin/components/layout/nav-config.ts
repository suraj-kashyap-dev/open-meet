import {
  BarChart3,
  CalendarRange,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavChild {
  labelKey: string;
  href: string;
}

export interface NavItem {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
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
      { labelKey: 'items.users', href: '/users', icon: Users },
      { labelKey: 'items.teams', href: '/teams', icon: UsersRound },
      { labelKey: 'items.groups', href: '/groups', icon: MessagesSquare },
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
