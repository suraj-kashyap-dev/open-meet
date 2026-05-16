'use client';

import {
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
  Hand,
  HandMetal,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Smile,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ClientEvent } from '@open-meet/types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrentUser } from '@/hooks/use-auth';
import { useEndMeeting } from '@/hooks/use-meetings';
import type { MeetingSocket } from '@/hooks/use-socket';
import { useChatStore, useUIStore } from '@/stores';
import { ApiClientError } from '@/lib/api';
import { meetingsApi } from '@/lib/api/meetings';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'] as const;

interface Props {
  code: string;
  socket: MeetingSocket | null;
  hostId: string;
}

export function MeetingControls({ code, socket, hostId }: Props) {
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { data: user } = useCurrentUser();
  const setChatOpen = useChatStore((s) => s.setOpen);
  const isChatOpen = useChatStore((s) => s.isOpen);
  const unread = useChatStore((s) => s.unread);
  const setParticipantsOpen = useUIStore((s) => s.setParticipantsOpen);
  const isParticipantsOpen = useUIStore((s) => s.participantsOpen);
  const endMeeting = useEndMeeting();
  const [handRaised, setHandRaised] = useState(false);

  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const isScreenSharing = screenShareTracks.some(
    (t) => t.participant.identity === localParticipant.identity,
  );

  const isHost = user?.id === hostId;
  const micEnabled = localParticipant.isMicrophoneEnabled;
  const cameraEnabled = localParticipant.isCameraEnabled;

  const toggleMic = () => {
    void localParticipant.setMicrophoneEnabled(! micEnabled);
  };
  const toggleCamera = () => {
    void localParticipant.setCameraEnabled(! cameraEnabled);
  };
  const toggleScreenShare = () => {
    void localParticipant.setScreenShareEnabled(! isScreenSharing);
  };

  const toggleHand = () => {
    if (! socket) {
      return;
    }
    if (handRaised) {
      socket.emit(ClientEvent.HAND_LOWER, { meetingCode: code });
      setHandRaised(false);
    } else {
      socket.emit(ClientEvent.HAND_RAISE, { meetingCode: code });
      setHandRaised(true);
    }
  };

  const sendReaction = (emoji: string) => {
    if (! socket) {
      return;
    }
    socket.emit(ClientEvent.REACTION_SEND, { meetingCode: code, emoji });
  };

  const onLeave = async () => {
    try {
      await meetingsApi.leave(code);
    } catch {
      // best-effort
    }
    await room.disconnect();
    router.replace(`/meeting/${code}/ended`);
  };

  const onEndForAll = async () => {
    try {
      await endMeeting.mutateAsync(code);
      await room.disconnect();
      router.replace(`/meeting/${code}/ended`);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Could not end meeting';
      toast.error(message);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <footer className="flex items-center justify-center gap-2 border-t border-border bg-card/80 px-4 py-3 backdrop-blur">
        <ControlButton
          label={micEnabled ? 'Mute' : 'Unmute'}
          active={! micEnabled}
          onClick={toggleMic}
        >
          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </ControlButton>

        <ControlButton
          label={cameraEnabled ? 'Stop video' : 'Start video'}
          active={! cameraEnabled}
          onClick={toggleCamera}
        >
          {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </ControlButton>

        <ControlButton
          label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          active={isScreenSharing}
          onClick={toggleScreenShare}
        >
          <MonitorUp className="h-4 w-4" />
        </ControlButton>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="React">
                  <Smile className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>React</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="top" className="flex gap-1 p-1">
            {REACTION_EMOJIS.map((emoji) => (
              <DropdownMenuItem
                key={emoji}
                onSelect={() => sendReaction(emoji)}
                className="text-xl"
              >
                {emoji}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ControlButton
          label={handRaised ? 'Lower hand' : 'Raise hand'}
          active={handRaised}
          onClick={toggleHand}
        >
          {handRaised ? (
            <HandMetal className="h-4 w-4" />
          ) : (
            <Hand className="h-4 w-4" />
          )}
        </ControlButton>

        <div className="mx-2 h-6 w-px bg-border" />

        <ControlButton
          label="Chat"
          active={isChatOpen}
          onClick={() => setChatOpen(! isChatOpen)}
        >
          <MessageSquare className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </ControlButton>

        <ControlButton
          label="Participants"
          active={isParticipantsOpen}
          onClick={() => setParticipantsOpen(! isParticipantsOpen)}
        >
          <Users className="h-4 w-4" />
        </ControlButton>

        <div className="mx-2 h-6 w-px bg-border" />

        {isHost ? (
          <Button
            variant="destructive"
            onClick={onEndForAll}
            disabled={endMeeting.isPending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            End for all
          </Button>
        ) : null}
        <Button variant="destructive" onClick={onLeave} className="gap-2">
          <PhoneOff className="h-4 w-4" />
          Leave
        </Button>
      </footer>
    </TooltipProvider>
  );
}

function ControlButton({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={active ? 'destructive' : 'ghost'}
          onClick={onClick}
          className="relative"
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
