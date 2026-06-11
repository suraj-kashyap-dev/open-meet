import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

function isLocale(segment: string | undefined): segment is (typeof routing.locales)[number] {
  return !!segment && (routing.locales as readonly string[]).includes(segment);
}

export default function middleware(request: NextRequest) {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);

  if (segments.length === 1 && isLocale(segments[0])) {
    const url = request.nextUrl.clone();

    url.pathname = `/${segments[0]}/chat`;

    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
