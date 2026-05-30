'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { adminLoginHref } from '@/features/auth/lib/redirect';
import { usePathname } from '@/i18n/navigation';
import { UNAUTHORIZED_EVENT } from '@/lib/api/client';

const ADMIN_ME_KEY = ['admin', 'me'] as const;

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

      if (failedPath.endsWith('/auth/login')) {
        return;
      }

      const cachedAdmin = qc.getQueryData(ADMIN_ME_KEY);
      const hadCachedAdmin =
        cachedAdmin !== null &&
        cachedAdmin !== undefined &&
        typeof cachedAdmin === 'object' &&
        'id' in cachedAdmin;

      if (failedAuthProbe && !hadCachedAdmin) {
        return;
      }

      qc.setQueryData(ADMIN_ME_KEY, null);

      if (pathname.startsWith('/login') || pathname.startsWith('/accept-invite')) {
        return;
      }

      redirectingRef.current = true;
      toast.error('Your session expired — please sign in again.');
      window.location.replace(adminLoginHref());
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handler);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handler);
    };
  }, [pathname, qc]);

  return null;
}
