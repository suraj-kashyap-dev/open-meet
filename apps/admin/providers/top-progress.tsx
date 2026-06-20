'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { usePathname } from '@/i18n/navigation';

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
    setPathPulse((current) => current + 1);
  }, [pathname]);

  useEffect(() => {
    const startBurst = pathPulse > 0;
    const active = pending || startBurst;

    if (active) {
      setProgress((current) => (current < 10 ? 10 : current));

      if (intervalRef.current === null) {
        intervalRef.current = window.setInterval(() => {
          setProgress((current) => {
            if (current >= 80) {
              return current;
            }

            return current + (80 - current) * 0.12;
          });
        }, 180);
      }

      if (completeRef.current !== null) {
        window.clearTimeout(completeRef.current);

        completeRef.current = null;
      }

      if (startBurst && !pending) {
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
  }, [pathPulse, pending]);

  useEffect(
    () => () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }

      if (completeRef.current !== null) {
        window.clearTimeout(completeRef.current);
      }
    },
    [],
  );

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
