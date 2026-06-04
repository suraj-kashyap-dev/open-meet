'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

export function useNavigateTransition() {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();

  const push = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href as never);
      });
    },
    [router],
  );

  const replace = useCallback(
    (href: string) => {
      startTransition(() => {
        router.replace(href as never);
      });
    },
    [router],
  );

  return { isNavigating, push, replace };
}
