import { defaultLocale, locales } from '@/i18n/routing';

export const REDIRECT_PARAM = 'redirect';

const HOME = '/';

function stripLocale(path: string): string {
  const match = /^\/([^/?#]+)(.*)$/.exec(path);
  const first = match?.[1];

  if (!first || !(locales as readonly string[]).includes(first)) {
    return path;
  }

  const rest = match?.[2] ?? '';

  if (!rest) {
    return HOME;
  }

  return rest.startsWith('/') ? rest : `/${rest}`;
}

export function resolveRedirect(raw: string | null | undefined): string {
  if (!raw) {
    return HOME;
  }

  const path = stripLocale(raw);

  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) {
    return HOME;
  }

  if (
    path === '/login' ||
    path === '/register' ||
    path.startsWith('/login?') ||
    path.startsWith('/register?')
  ) {
    return HOME;
  }

  return path;
}

type LoginHref = '/login' | { pathname: '/login'; query: Record<string, string> };

export function loginHref(intended: string): LoginHref {
  const safe = resolveRedirect(intended);

  return safe === HOME ? '/login' : { pathname: '/login', query: { [REDIRECT_PARAM]: safe } };
}

export function currentClientPath(): string {
  if (typeof window === 'undefined') {
    return HOME;
  }

  const { pathname, search, hash } = window.location;

  return stripLocale(`${pathname}${search}${hash}`);
}

function currentLocale(): string {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  const segment = window.location.pathname.split('/')[1] ?? '';

  return (locales as readonly string[]).includes(segment) ? segment : defaultLocale;
}

export function browserLoginHref(intended: string): string {
  const target = loginHref(intended);
  const localePrefix = `/${currentLocale()}`;

  if (typeof target === 'string') {
    return `${localePrefix}${target}`;
  }

  const search = new URLSearchParams(target.query).toString();

  return `${localePrefix}${target.pathname}${search ? `?${search}` : ''}`;
}
