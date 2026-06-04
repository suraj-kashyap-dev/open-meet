import { Settings, User, type LucideIcon } from 'lucide-react';

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
];

export function isAccountActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
