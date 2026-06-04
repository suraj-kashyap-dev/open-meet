'use client';

import {
  ParticipantTile,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { GripVertical, Maximize2, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { MeetingDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import { useRouter } from '@/i18n/navigation';
import { useDraggable } from '@/features/web/meeting/hooks/use-draggable';
import { meetingsApi } from '@/features/web/meeting/services/meetings';
import { useActiveMeeting } from '@/features/web/meeting/stores';

const MINI_WIDTH = 288;
const MINI_HEIGHT = 252;

interface Props {
  code: string;
  meeting: MeetingDto;
}

export function MiniMeeting({ code, meeting }: Props) {
  const t = useTranslations('meeting');
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();

  const position = useActiveMeeting((s) => s.position);
  const setPosition = useActiveMeeting((s) => s.setPosition);
  const maximize = useActiveMeeting((s) => s.maximize);
  const authToken = useActiveMeeting((s) =>
    s.session?.code === code ? s.session.authToken : null,
  );

  const [leaving, setLeaving] = useState(false);

  const { dragging, handleProps } = useDraggable({
    size: { width: MINI_WIDTH, height: MINI_HEIGHT },
    value: position,
    onChange: setPosition,
  });

  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false },
  );

  const featured = useMemo(() => {
    const screen = tracks.find((tr) => tr.source === Track.Source.ScreenShare);
    if (screen) {
      return screen;
    }

    const remote = tracks.find(
      (tr) =>
        tr.source === Track.Source.Camera && tr.participant.identity !== localParticipant?.identity,
    );

    return remote ?? tracks.find((tr) => tr.source === Track.Source.Camera) ?? null;
  }, [tracks, localParticipant?.identity]);

  const expand = () => {
    maximize();
    router.push(`/${code}`);
  };

  const toggleMic = () => {
    void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  const toggleCamera = () => {
    void localParticipant.setCameraEnabled(!isCameraEnabled);
  };

  const leave = async () => {
    if (leaving) {
      return;
    }

    setLeaving(true);

    try {
      await meetingsApi.leave(code, authToken);
    } catch {
      // best-effort - disconnect locally regardless
    }

    await room.disconnect();
  };

  return (
    <div
      data-lk-theme="default"
      style={position ? { left: position.x, top: position.y } : { right: 16, bottom: 16 }}
      className={cn(
        'fixed z-50 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/30',
        dragging && 'select-none',
      )}
    >
      <div
        {...handleProps}
        className={cn(
          'flex touch-none items-center gap-1.5 border-b border-border bg-card/95 px-2.5 py-1.5',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {meeting.title || t('top-bar.untitled')}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={expand}
          aria-label={t('mini.expand')}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <button
        type="button"
        onClick={expand}
        aria-label={t('mini.expand')}
        className="relative block aspect-video w-full bg-zinc-950"
      >
        {featured ? (
          <ParticipantTile trackRef={featured} className="pointer-events-none h-full w-full" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {t('mini.connecting')}
          </span>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 border-t border-border bg-card/95 px-3 py-2">
        <Button
          size="icon"
          variant={isMicrophoneEnabled ? 'ghost' : 'destructive'}
          className="h-8 w-8"
          onClick={toggleMic}
          aria-label={isMicrophoneEnabled ? t('controls.mute') : t('controls.unmute')}
        >
          {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>

        <Button
          size="icon"
          variant={isCameraEnabled ? 'ghost' : 'destructive'}
          className="h-8 w-8"
          onClick={toggleCamera}
          aria-label={isCameraEnabled ? t('controls.stop-video') : t('controls.start-video')}
        >
          {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>

        <Button
          size="icon"
          variant="destructive"
          className="h-8 w-8"
          onClick={() => void leave()}
          disabled={leaving}
          aria-label={t('controls.leave')}
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
