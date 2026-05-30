'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Keeps a textarea sized to its content up to `maxRows`, re-measuring whenever
 * `value` changes. Returns the ref to attach to the textarea.
 */
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
