import { defaultLocale, locales } from '@/i18n/routing';

const LOGIN = '/login';

function currentLocale(): string {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  const segment = window.location.pathname.split('/')[1] ?? '';

  return (locales as readonly string[]).includes(segment) ? segment : defaultLocale;
}

export function adminLoginHref(): string {
  return `/${currentLocale()}${LOGIN}`;
}
