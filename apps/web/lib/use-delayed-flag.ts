'use client';

import { useEffect, useState } from 'react';

export function useDelayedFlag(active: boolean, delay = 300): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }

    const id = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(id);
  }, [active, delay]);

  return shown;
}
