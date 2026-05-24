import { History, Settings, User, type LucideIcon } from 'lucide-react';

export interface AccountNavItem {
  labelKey: string;
  descriptionKey: string;
  href: string;
  icon: LucideIcon;
}

export const accountNav: AccountNavItem[] = [
  {
    labelKey: 'sidebar.profile-label',
    descriptionKey: 'sidebar.profile-description',
    href: '/profile',
    icon: User,
  },
  {
    labelKey: 'sidebar.settings-label',
    descriptionKey: 'sidebar.settings-description',
    href: '/settings',
    icon: Settings,
  },
  {
    labelKey: 'sidebar.history-label',
    descriptionKey: 'sidebar.history-description',
    href: '/history',
    icon: History,
  },
];

export function isAccountActive(pathname: string, href: string): boolean {
  if (href === '/history') {
    return pathname === '/history' || pathname.startsWith('/history/');
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
