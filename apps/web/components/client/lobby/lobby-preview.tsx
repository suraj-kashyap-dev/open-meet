'use client';

import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useCallback } from 'react';

import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/shared/cn';
import type { useMediaDevices } from '@/hooks/client/use-media-devices';

import { AudioMeter } from './audio-meter';

type MediaState = ReturnType<typeof useMediaDevices>;

interface Props {
  media: MediaState;
  displayName: string;
}

export function LobbyPreview({ media, displayName }: Props) {
  const stream = media.stream;

  const attachStream = useCallback(
    (el: HTMLVideoElement | null) => {
      if (! el) {
        return;
      }

      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
    },
    [stream],
  );

  const showVideo = media.cameraEnabled && Boolean(media.stream);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative isolate aspect-video w-full overflow-hidden rounded-2xl border border-border bg-zinc-950 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
        {showVideo ? (
          <video
            ref={attachStream}
            autoPlay
            muted
            playsInline
            className="h-full w-full -scale-x-100 object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            <UserAvatar
              user={{ name: displayName }}
              size="4xl"
              className="h-24 w-24 ring-2 ring-white/10 sm:h-28 sm:w-28"
              fallbackClassName="bg-zinc-800 text-3xl font-medium text-zinc-100"
            />
            <p className="text-sm text-zinc-400">Camera is off</p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/55 via-black/0 to-black/0" />

        {media.error ? (
          <div className="absolute inset-x-3 top-3 rounded-md border border-destructive/40 bg-destructive/20 px-3 py-1.5 text-xs text-destructive backdrop-blur-sm">
            {media.error}
          </div>
        ) : null}

        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs text-white backdrop-blur-md">
          <AudioMeter stream={media.stream} active={media.micEnabled} />
          <span className="font-medium">{displayName}</span>
        </div>

        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={media.micEnabled ? 'ghost' : 'destructive'}
                size="icon"
                onClick={() => media.setMicEnabled(! media.micEnabled)}
                aria-label={media.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
                className={cn(
                  'h-11 w-11 rounded-full border border-white/15 backdrop-blur-md',
                  media.micEnabled
                    ? 'bg-white/15 text-white hover:bg-white/25'
                    : '',
                )}
              >
                {media.micEnabled ? (
                  <Mic className="h-5 w-5" />
                ) : (
                  <MicOff className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {media.micEnabled ? 'Turn off microphone' : 'Turn on microphone'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={media.cameraEnabled ? 'ghost' : 'destructive'}
                size="icon"
                onClick={() => media.setCameraEnabled(! media.cameraEnabled)}
                aria-label={media.cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
                className={cn(
                  'h-11 w-11 rounded-full border border-white/15 backdrop-blur-md',
                  media.cameraEnabled
                    ? 'bg-white/15 text-white hover:bg-white/25'
                    : '',
                )}
              >
                {media.cameraEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {media.cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
