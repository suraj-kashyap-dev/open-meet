'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { UNAUTHORIZED_EVENT } from '@/lib/api/client';

const ADMIN_ME_KEY = ['admin', 'me'] as const;

export function UnauthorizedBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail;
      const failedPath = detail?.path ?? '';

      // The auth probe (`/admin/auth/me`) resolves its own 401 — ignore it here.
      if (failedPath.endsWith('/auth/me')) {
        return;
      }

      qc.setQueryData(ADMIN_ME_KEY, null);

      if (pathname === '/login') {
        return;
      }

      toast.error('Your session expired — please sign in again.');
      router.replace('/login');
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handler);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handler);
    };
  }, [pathname, router, qc]);

  return null;
}
