'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function TopProgress() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const completeRef = useRef<number | null>(null);

  const pending = fetching > 0 || mutating > 0;

  const [pathPulse, setPathPulse] = useState(0);

  useEffect(() => {
    setPathPulse((p) => p + 1);
  }, [pathname]);

  useEffect(() => {
    const startBurst = pathPulse > 0;
    const active = pending || startBurst;

    if (active) {
      setProgress((p) => (p < 10 ? 10 : p));

      if (intervalRef.current === null) {
        intervalRef.current = window.setInterval(() => {
          setProgress((p) => {
            if (p >= 80) {
              return p;
            }

            return p + (80 - p) * 0.12;
          });
        }, 180);
      }

      if (completeRef.current !== null) {
        window.clearTimeout(completeRef.current);

        completeRef.current = null;
      }

      if (startBurst && !pending) {
        if (completeRef.current !== null) {
          window.clearTimeout(completeRef.current);
        }

        completeRef.current = window.setTimeout(() => {
          finish();
        }, 420);
      }
    } else {
      finish();
    }

    function finish() {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);

        intervalRef.current = null;
      }

      setProgress(100);

      completeRef.current = window.setTimeout(() => {
        setProgress(0);

        completeRef.current = null;
      }, 240);
    }

    return () => {};
  }, [pending, pathPulse]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className="h-full origin-left bg-gradient-to-r from-accent via-accent to-accent/70 shadow-[0_0_8px_var(--color-accent)] transition-all duration-300 ease-out rtl:origin-right rtl:bg-gradient-to-l"
        style={{
          transform: `scaleX(${progress / 100})`,
          opacity: progress > 0 ? 1 : 0,
        }}
      />
    </div>
  );
}
