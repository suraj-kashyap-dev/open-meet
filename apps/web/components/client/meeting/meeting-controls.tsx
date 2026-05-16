'use client';

import {
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import EmojiPicker, {
  EmojiStyle,
  Theme as EmojiPickerTheme,
  type EmojiClickData,
} from 'emoji-picker-react';
import {
  Check,
  Copy,
  Hand,
  HandMetal,
  Info,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PhoneOff,
  Smile,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ClientEvent } from '@open-meet/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCurrentUser } from '@/hooks/client/use-auth';
import { useEndMeeting } from '@/hooks/client/use-meetings';
import type { MeetingSocket } from '@/hooks/client/use-socket';
import { useChatStore, useUIStore } from '@/store/client';
import { ApiClientError } from '@/lib/shared/api';
import { meetingsApi } from '@/services/client/meetings';

interface Props {
  code: string;
  socket: MeetingSocket | null;
  hostId: string;
}

export function MeetingControls({ code, socket, hostId }: Props) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const { data: user } = useCurrentUser();
  const setChatOpen = useChatStore((s) => s.setOpen);
  const isChatOpen = useChatStore((s) => s.isOpen);
  const unread = useChatStore((s) => s.unread);
  const setParticipantsOpen = useUIStore((s) => s.setParticipantsOpen);
  const isParticipantsOpen = useUIStore((s) => s.participantsOpen);
  const endMeeting = useEndMeeting();
  const [handRaised, setHandRaised] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [endAllOpen, setEndAllOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);

  const { resolvedTheme } = useTheme();

  const pickerTheme =
    resolvedTheme === 'dark' ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT;

  const isHost = user?.id === hostId;
  const micEnabled = isMicrophoneEnabled;
  const cameraEnabled = isCameraEnabled;
  const isScreenSharing = isScreenShareEnabled;

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (leaving) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [leaving]);

  const [micBusy, setMicBusy] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [screenBusy, setScreenBusy] = useState(false);

  const toggleMic = async () => {
    if (micBusy) {
      return;
    }

    setMicBusy(true);

    try {
      await localParticipant.setMicrophoneEnabled(! micEnabled);
    } catch (err) {
      toast.error(`Could not toggle microphone: ${(err as Error).message}`);
    } finally {
      setMicBusy(false);
    }
  };

  const toggleCamera = async () => {
    if (cameraBusy) {
      return;
    }

    setCameraBusy(true);
    
    try {
      await localParticipant.setCameraEnabled(! cameraEnabled);
    } catch (err) {
      toast.error(`Could not toggle camera: ${(err as Error).message}`);
    } finally {
      setCameraBusy(false);
    }
  };

  const toggleScreenShare = async () => {
    if (screenBusy) {
      return;
    }

    setScreenBusy(true);

    try {
      await localParticipant.setScreenShareEnabled(! isScreenSharing);
    } catch (err) {
      toast.error(`Could not toggle screen share: ${(err as Error).message}`);
    } finally {
      setScreenBusy(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.error('Could not toggle full screen');
    }
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

  const onCopyLink = async () => {
    const url = `${window.location.origin}/${code}`;
    
    try {
      await navigator.clipboard.writeText(url);
    
      setCopied(true);
    
      toast.success('Meeting link copied');
    
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const confirmLeave = async () => {
    setLeaving(true);
    
    try {
      await meetingsApi.leave(code);
    } catch {
      // best-effort
    }
    
    await room.disconnect();
  };

  const confirmEndForAll = async () => {
    setLeaving(true);
    try {
      await endMeeting.mutateAsync(code);
      await room.disconnect();
    } catch (err) {
      setLeaving(false);
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

        <Popover open={reactionPickerOpen} onOpenChange={setReactionPickerOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="React">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>React</TooltipContent>
          </Tooltip>
          <PopoverContent side="top" align="center" className="border-0 p-0 shadow-xl">
            <EmojiPicker
              onEmojiClick={(data: EmojiClickData) => {
                sendReaction(data.emoji);
                setReactionPickerOpen(false);
              }}
              emojiStyle={EmojiStyle.TWITTER}
              theme={pickerTheme}
              height={400}
              width={340}
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
              lazyLoadEmojis
            />
          </PopoverContent>
        </Popover>

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
          onClick={() => {
            if (isParticipantsOpen) {
              setParticipantsOpen(false);
            }

            setChatOpen(! isChatOpen);
          }}
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
          onClick={() => {
            if (isChatOpen) {
              setChatOpen(false);
            }

            setParticipantsOpen(! isParticipantsOpen);
          }}
        >
          <Users className="h-4 w-4" />
        </ControlButton>

        <ControlButton label="Meeting info" onClick={() => setInfoOpen(true)}>
          <Info className="h-4 w-4" />
        </ControlButton>

        <ControlButton
          label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </ControlButton>

        <div className="mx-2 h-6 w-px bg-border" />

        {isHost ? (
          <Button
            variant="destructive"
            onClick={() => setEndAllOpen(true)}
            disabled={endMeeting.isPending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            End for all
          </Button>
        ) : null}
        <Button variant="destructive" onClick={() => setLeaveOpen(true)} className="gap-2">
          <PhoneOff className="h-4 w-4" />
          Leave
        </Button>
      </footer>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting details</DialogTitle>
            <DialogDescription>
              Share the code or link with anyone you want to invite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Meeting code
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
                  {code}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onCopyLink}
                  aria-label="Copy meeting link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Anyone with this link will be asked for permission to join. The host approves
              every guest.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave this meeting?</DialogTitle>
            <DialogDescription>
              You&apos;ll be removed from the call. The meeting continues for everyone else,
              and you can rejoin while it&apos;s still in progress.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)} disabled={leaving}>
              Stay
            </Button>
            <Button variant="destructive" onClick={confirmLeave} disabled={leaving}>
              <PhoneOff className="h-4 w-4" />
              {leaving ? 'Leaving…' : 'Leave meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={endAllOpen} onOpenChange={setEndAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End meeting for everyone?</DialogTitle>
            <DialogDescription>
              All participants will be disconnected immediately. This cannot be undone — anyone
              wanting to continue will need to start a new meeting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndAllOpen(false)} disabled={leaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmEndForAll} disabled={leaving}>
              <X className="h-4 w-4" />
              {leaving ? 'Ending…' : 'End for all'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
