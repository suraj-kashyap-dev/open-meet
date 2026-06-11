'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { browserLoginHref, currentClientPath } from '@/features/web/auth/lib/redirect';
import { useChatStore } from '@/features/web/chat/stores';
import { usePathname } from '@/i18n/navigation';
import { UNAUTHORIZED_EVENT } from '@/lib/api/client';

const ME_KEY = ['auth', 'me'] as const;
const CACHE_KEY = 'open-meet:user';

export function UnauthorizedBridge() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const redirectingRef = useRef(false);

  useEffect(() => {
    const handler = (event: Event) => {
      if (redirectingRef.current) {
        return;
      }

      const detail = (event as CustomEvent<{ path: string }>).detail;
      const failedPath = detail?.path ?? '';
      const failedAuthProbe = failedPath.endsWith('/auth/me');

      if (failedPath.endsWith('/auth/login') || failedPath.endsWith('/auth/register')) {
        return;
      }

      const cachedUser = qc.getQueryData(ME_KEY);
      const hadCachedUser =
        cachedUser !== null &&
        cachedUser !== undefined &&
        typeof cachedUser === 'object' &&
        'id' in cachedUser;

      const hadStoredUser = (() => {
        try {
          return window.localStorage.getItem(CACHE_KEY) !== null;
        } catch {
          return false;
        }
      })();

      if (failedAuthProbe && !hadCachedUser && !hadStoredUser) {
        return;
      }

      try {
        window.localStorage.removeItem(CACHE_KEY);
      } catch {}

      qc.setQueryData(ME_KEY, null);

      useChatStore.getState().reset();

      const isGuestMeetingPath =
        /^\/[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/.test(pathname) ||
        /^\/[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}\/lobby$/.test(pathname);

      const isPublic =
        pathname.startsWith('/login') ||
        pathname.startsWith('/accept-invite') ||
        pathname.startsWith('/register') ||
        isGuestMeetingPath;

      if (isPublic) {
        return;
      }

      redirectingRef.current = true;

      toast.error('Your session expired - please sign in again.');

      window.location.replace(browserLoginHref(currentClientPath()));
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handler);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handler);
    };
  }, [pathname, qc]);

  return null;
}
