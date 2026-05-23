export const REDIRECT_PARAM = 'redirect';

const HOME = '/';

/**
 * Validate a post-login redirect target read from the URL. Only same-origin
 * absolute paths are allowed — external URLs, protocol-relative `//host` (or
 * the `/\\host` backslash variant browsers normalize to it), and the auth
 * screens themselves all collapse to the home route. This blocks open-redirect
 * abuse via the `?redirect=` query param.
 */
export function resolveRedirect(raw: string | null | undefined): string {
  if (!raw) {
    return HOME;
  }

  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return HOME;
  }

  if (
    raw === '/login' ||
    raw === '/register' ||
    raw.startsWith('/login?') ||
    raw.startsWith('/register?')
  ) {
    return HOME;
  }

  return raw;
}

/**
 * Build the login URL for an unauthenticated visitor, preserving the page they
 * were trying to reach so they land back there after signing in.
 */
export function loginUrlWithRedirect(intended: string): string {
  const safe = resolveRedirect(intended);

  return safe === HOME ? '/login' : `/login?${REDIRECT_PARAM}=${encodeURIComponent(safe)}`;
}

/**
 * The path (with query + hash) the browser is currently on. Client-only —
 * call it from event handlers or effects, never during a server render.
 */
export function currentClientPath(): string {
  if (typeof window === 'undefined') {
    return HOME;
  }

  const { pathname, search, hash } = window.location;

  return `${pathname}${search}${hash}`;
}
