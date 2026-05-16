import { History, User, type LucideIcon } from 'lucide-react';

export interface AccountNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const accountNav: AccountNavItem[] = [
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
    description: 'Your account details',
  },
  {
    label: 'Meeting history',
    href: '/history',
    icon: History,
    description: 'Past meetings, chats and files',
  },
];

export function isAccountActive(pathname: string, href: string): boolean {
  if (href === '/history') {
    return pathname === '/history' || pathname.startsWith('/history/');
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
