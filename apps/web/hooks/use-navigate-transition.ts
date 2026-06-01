'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';

/**
 * Wraps `router.push` / `router.replace` in a React transition so `isNavigating`
 * stays `true` from the click through the new page's first paint. Lets buttons
 * keep their pending state across the gap between "API resolved" and "next
 * route mounted" - that gap is what makes clicks feel unresponsive.
 */
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
