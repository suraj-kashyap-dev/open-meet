'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useAutoResizeTextarea(
  value: string,
  maxRows = 4,
): React.RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjust = useCallback(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    el.style.height = 'auto';
    const max = maxRows * 24 + 16;

    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [maxRows]);

  useEffect(() => {
    adjust();
  }, [value, adjust]);

  return ref;
}
