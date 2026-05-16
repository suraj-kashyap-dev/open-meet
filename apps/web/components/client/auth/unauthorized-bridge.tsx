'use client';

import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { UNAUTHORIZED_EVENT } from '@/lib/shared/api';

const ME_KEY = ['auth', 'me'] as const;
const CACHE_KEY = 'open-meet:user';

export function UnauthorizedBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ path: string }>).detail;
      const failedPath = detail?.path ?? '';

      if (failedPath.endsWith('/auth/me')) {
        return;
      }

      try {
        window.localStorage.removeItem(CACHE_KEY);
      } catch {
      }

      qc.setQueryData(ME_KEY, null);

      const isPublic =
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/register');

      if (isPublic) {
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
