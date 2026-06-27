export function shouldHideMobileBottomNav(pathname: string) {
  return /^\/chat\/.+/.test(pathname);
}
