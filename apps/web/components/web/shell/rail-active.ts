/**
 * Whether a rail item is the active section for the current pathname.
 * `pathname` is locale-stripped (from next-intl's `usePathname`), e.g. `/chat/123`.
 * Active on an exact match or any nested route, but never on a sibling that
 * merely shares a string prefix (`/teams` must not light up on `/teams-archive`).
 */
export function isRailActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
