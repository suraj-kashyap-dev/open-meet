'use client';

import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

import { elapsedSeconds, formatDuration } from '@open-meet/utils';

interface Props {
  startedAt: string;
  hostEnded?: boolean;
}

export function MeetingTimer({ startedAt, hostEnded }: Props) {
  const [secs, setSecs] = useState(() => elapsedSeconds(startedAt));

  useEffect(() => {
    if (hostEnded) {
      return;
    }
    const id = window.setInterval(() => {
      setSecs(elapsedSeconds(startedAt));
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [startedAt, hostEnded]);

  return (
    <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-md bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
      <Clock className="h-3.5 w-3.5" />
      <span className="font-mono">{formatDuration(secs)}</span>
    </div>
  );
}
