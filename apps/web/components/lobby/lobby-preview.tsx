'use client';

import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import type { useMediaDevices } from '@/hooks/use-media-devices';

type MediaState = ReturnType<typeof useMediaDevices>;

interface Props {
  media: MediaState;
}

export function LobbyPreview({ media }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && media.stream) {
      videoRef.current.srcObject = media.stream;
    }
  }, [media.stream]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
      {media.cameraEnabled && media.stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Camera off
        </div>
      )}

      <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
        <Button
          variant={media.micEnabled ? 'outline' : 'destructive'}
          size="icon"
          onClick={() => media.setMicEnabled(! media.micEnabled)}
          aria-label={media.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {media.micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button
          variant={media.cameraEnabled ? 'outline' : 'destructive'}
          size="icon"
          onClick={() => media.setCameraEnabled(! media.cameraEnabled)}
          aria-label={media.cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {media.cameraEnabled ? (
            <Video className="h-4 w-4" />
          ) : (
            <VideoOff className="h-4 w-4" />
          )}
        </Button>
      </div>

      {media.error ? (
        <div className="absolute inset-x-2 top-2 rounded-md bg-destructive/20 px-3 py-1 text-xs text-destructive">
          {media.error}
        </div>
      ) : null}
    </div>
  );
}
