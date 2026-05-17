'use client';

import { useEffect, useState } from 'react';

import { useRecordingStore } from '@/features/web/meeting/stores';

function formatElapsed(startIso: string, nowMs: number): string {
  const diff = Math.max(0, nowMs - new Date(startIso).getTime());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');

  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function RecordingBanner() {
  const active = useRecordingStore((s) => s.active);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      return;
    }

    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) {
    return null;
  }

  const elapsed = formatElapsed(active.startedAt, now);
  const starter = active.startedByName ?? 'the host';

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-destructive/50 bg-destructive/95 px-4 py-2 text-destructive-foreground shadow-[0_8px_30px_-8px_rgba(220,38,38,0.55)] ring-1 ring-destructive/40 backdrop-blur">
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive-foreground/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive-foreground" />
        </span>

        <span className="text-xs font-semibold uppercase tracking-[0.16em]">Recording</span>
        <span className="font-mono text-sm tabular-nums">{elapsed}</span>

        <span
          aria-hidden
          className="hidden h-4 w-px bg-destructive-foreground/40 sm:inline-block"
        />

        <span className="hidden text-xs text-destructive-foreground/85 sm:inline">
          Started by <span className="font-medium">{starter}</span>
        </span>
      </div>
    </div>
  );
}
