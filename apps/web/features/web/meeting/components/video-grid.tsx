'use client';

import {
  ParticipantTile,
  useIsMuted,
  useLocalParticipant,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Hand } from 'lucide-react';
import { useMemo } from 'react';

import { UserAvatar } from '@/components/shared/user-avatar';
import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { parseParticipantMetadata } from '@/features/web/meeting/lib/participant-metadata';
import { useMeetingStore } from '@/features/web/meeting/stores';
import { cn } from '@/lib/cn';

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

type RaisedHandsMap = Record<string, unknown>;

interface TileProps {
  track: TrackReferenceOrPlaceholder;
  raisedHands: RaisedHandsMap;
  className?: string;
}

function Tile({ track, raisedHands, className }: TileProps) {
  const identity = track.participant.identity;
  const isCamera = track.source === Track.Source.Camera;
  const hasHand = Boolean(raisedHands[identity]) && isCamera;
  const isMuted = useIsMuted(track);
  const showAvatar = isCamera && isMuted;

  const { localParticipant } = useLocalParticipant();
  const { data: currentUser } = useCurrentUser();
  const isLocal = identity === localParticipant?.identity;

  const remoteName = track.participant.name?.trim();
  const localName = isLocal ? currentUser?.name?.trim() : undefined;
  const displayName = remoteName || localName || identity || 'Guest';

  const { avatar: metadataAvatar } = parseParticipantMetadata(track.participant.metadata);
  const avatar = metadataAvatar ?? (isLocal ? (currentUser?.avatar ?? null) : null);

  return (
    <div
      className={cn('relative overflow-hidden rounded-lg border border-border bg-muted', className)}
    >
      <ParticipantTile trackRef={track} className="h-full w-full" />

      {showAvatar ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-9 flex items-center justify-center bg-zinc-950">
          <UserAvatar
            user={{ name: displayName, avatar }}
            size="4xl"
            className="h-24 w-24 ring-2 ring-white/10 sm:h-28 sm:w-28"
            fallbackClassName="bg-zinc-800 text-3xl font-medium text-zinc-100"
          />
        </div>
      ) : null}

      {hasHand ? (
        <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-warning/90 text-background">
          <Hand className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
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

  const { screens, cameras } = useMemo(() => {
    const screens: TrackReferenceOrPlaceholder[] = [];
    const cameras: TrackReferenceOrPlaceholder[] = [];

    for (const track of tracks) {
      if (track.source === Track.Source.ScreenShare) {
        screens.push(track);
      } else {
        cameras.push(track);
      }
    }

    return { screens, cameras };
  }, [tracks]);

  if (screens.length > 0) {
    return (
      <div className="flex h-full w-full flex-col gap-3 lg:flex-row">
        <section className="min-h-0 flex-1">
          <div
            className={cn(
              'grid h-full w-full auto-rows-fr gap-3',
              screens.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2',
            )}
          >
            {screens.map((screen) => (
              <Tile
                key={`${screen.participant.identity}-${screen.source}`}
                track={screen}
                raisedHands={raisedHands}
              />
            ))}
          </div>
        </section>

        {cameras.length > 0 ? (
          <aside
            className={cn(
              'flex shrink-0 gap-2 overflow-auto',
              'h-32 flex-row lg:h-full lg:w-72 lg:flex-col',
            )}
          >
            {cameras.map((cam) => (
              <Tile
                key={`${cam.participant.identity}-${cam.source}`}
                track={cam}
                raisedHands={raisedHands}
                className="aspect-video h-full shrink-0 lg:h-auto lg:w-full"
              />
            ))}
          </aside>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('grid h-full w-full auto-rows-fr gap-3', gridClass(cameras.length))}>
      {cameras.map((track) => (
        <Tile
          key={`${track.participant.identity}-${track.source}`}
          track={track}
          raisedHands={raisedHands}
        />
      ))}
    </div>
  );
}
