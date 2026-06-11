'use client';

import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from './cn';

const SHOW_DELAY_MS = 80;
const MIN_VISIBLE_MS = 500;

export function ActivityIndicator({ className }: { className?: string }) {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const pending = fetching > 0 || mutating > 0;

  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const shownAtRef = useRef(0);

  useEffect(() => {
    const clearShow = () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);

        showTimerRef.current = null;
      }
    };

    const clearHide = () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);

        hideTimerRef.current = null;
      }
    };

    if (pending) {
      clearHide();

      if (!visible && showTimerRef.current === null) {
        showTimerRef.current = window.setTimeout(() => {
          shownAtRef.current = Date.now();

          setVisible(true);

          showTimerRef.current = null;
        }, SHOW_DELAY_MS);
      }
    } else {
      clearShow();

      if (visible && hideTimerRef.current === null) {
        const elapsed = Date.now() - shownAtRef.current;
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

        hideTimerRef.current = window.setTimeout(() => {
          setVisible(false);

          hideTimerRef.current = null;
        }, remaining);
      }
    }
  }, [pending, visible]);

  useEffect(
    () => () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
      }

      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    },
    [],
  );

  return (
    <span
      aria-hidden={!visible}
      role="status"
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
    </span>
  );
}
