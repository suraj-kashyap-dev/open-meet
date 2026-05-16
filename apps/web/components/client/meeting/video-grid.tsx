'use client';

import {
  ParticipantTile,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Hand } from 'lucide-react';
import { useMemo } from 'react';

import { useMeetingStore } from '@/store/client';
import { cn } from '@/lib/shared/cn';

function gridClass(count: number): string {
  if (count <= 1) {
    return 'grid-cols-1';
  }
  if (count <= 2) {
    return 'grid-cols-1 sm:grid-cols-2';
  }
  if (count <= 4) {
    return 'grid-cols-2';
  }
  if (count <= 6) {
    return 'grid-cols-2 lg:grid-cols-3';
  }
  if (count <= 9) {
    return 'grid-cols-3';
  }
  return 'grid-cols-3 lg:grid-cols-4';
}

export function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const raisedHands = useMeetingStore((s) => s.raisedHands);

  const ordered = useMemo(() => {
    return [...tracks].sort((a, b) => {
      const aScreen = a.source === Track.Source.ScreenShare ? 1 : 0;
      const bScreen = b.source === Track.Source.ScreenShare ? 1 : 0;
      return bScreen - aScreen;
    });
  }, [tracks]);

  return (
    <div className={cn('grid h-full w-full gap-3', gridClass(ordered.length))}>
      {ordered.map((track) => {
        const identity = track.participant.identity;
        const hasHand = Boolean(raisedHands[identity]);
        return (
          <div
            key={`${identity}-${track.source}`}
            className="relative overflow-hidden rounded-lg border border-border bg-muted"
          >
            <ParticipantTile trackRef={track} className="h-full w-full" />
            {hasHand ? (
              <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-warning/90 text-background">
                <Hand className="h-4 w-4" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
