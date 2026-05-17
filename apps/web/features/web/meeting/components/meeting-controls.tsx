'use client';

import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import EmojiPicker, {
  EmojiStyle,
  Theme as EmojiPickerTheme,
  type EmojiClickData,
} from 'emoji-picker-react';
import {
  Check,
  Circle,
  Copy,
  Hand,
  HandMetal,
  Info,
  Loader2,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  MoreVertical,
  PhoneOff,
  Smile,
  Square,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useEndMeeting } from '@/features/web/meeting/hooks/use-meetings';
import type { MeetingSocket } from '@/features/web/meeting/hooks/use-socket';
import { recordingApi } from '@/features/web/meeting/services/recording';
import { useChatStore, useRecordingStore } from '@/features/web/meeting/stores';
import { useUIStore } from '@/stores';
import { ApiClientError } from '@/lib/api/client';
import { meetingsApi } from '@/features/web/meeting/services/meetings';

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
  const activeRecording = useRecordingStore((s) => s.active);
  const setActiveRecording = useRecordingStore((s) => s.setActive);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingConfirmOpen, setRecordingConfirmOpen] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState('00:00');
  const [handRaised, setHandRaised] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [endAllOpen, setEndAllOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);

  const { resolvedTheme } = useTheme();

  const pickerTheme = resolvedTheme === 'dark' ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT;

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
    if (!activeRecording) {
      setRecordingElapsed('00:00');
      return;
    }

    const startedAtMs = new Date(activeRecording.startedAt).getTime();
    const tick = () => {
      const diff = Math.max(0, Date.now() - startedAtMs);
      const total = Math.floor(diff / 1000);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      const mm = m.toString().padStart(2, '0');
      const ss = s.toString().padStart(2, '0');

      setRecordingElapsed(h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activeRecording]);

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
      await localParticipant.setMicrophoneEnabled(!micEnabled);
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
      await localParticipant.setCameraEnabled(!cameraEnabled);
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
      await localParticipant.setScreenShareEnabled(!isScreenSharing);
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
    if (!socket) {
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

  const confirmStartRecording = async () => {
    if (recordingBusy) {
      return;
    }

    setRecordingBusy(true);
    setRecordingConfirmOpen(false);

    try {
      const started = await recordingApi.start(code);
      setActiveRecording(started);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not start recording';
      toast.error(message);
    } finally {
      setRecordingBusy(false);
    }
  };

  const stopRecording = async () => {
    if (recordingBusy || !activeRecording) {
      return;
    }

    setRecordingBusy(true);

    try {
      await recordingApi.stop(code);
      // Optimistic clear: the egress takes a few seconds to finalize the
      // MP4 and a few more for the webhook to land, but from the host's
      // point of view the meeting is no longer being recorded. Clear the
      // UI immediately so they can start another one or just move on.
      // The recording will appear in /history as soon as it's processed.
      setActiveRecording(null);
      toast.success('Recording saved', {
        description: 'It will appear in this meeting’s history within a few seconds.',
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not stop recording';
      toast.error(message);
    } finally {
      setRecordingBusy(false);
    }
  };

  const sendReaction = (emoji: string) => {
    if (!socket) {
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
      const message = err instanceof ApiClientError ? err.message : 'Could not end meeting';
      toast.error(message);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <footer className="flex items-center justify-center gap-2 border-t border-border bg-card/80 px-4 py-3 backdrop-blur">
        <ControlButton
          label={micEnabled ? 'Mute' : 'Unmute'}
          active={!micEnabled}
          onClick={toggleMic}
        >
          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </ControlButton>

        <ControlButton
          label={cameraEnabled ? 'Stop video' : 'Start video'}
          active={!cameraEnabled}
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
          {handRaised ? <HandMetal className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
        </ControlButton>

        <div className="mx-2 h-6 w-px bg-border" />

        <ControlButton
          label="Chat"
          active={isChatOpen}
          onClick={() => {
            if (isParticipantsOpen) {
              setParticipantsOpen(false);
            }

            setChatOpen(!isChatOpen);
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

            setParticipantsOpen(!isParticipantsOpen);
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
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </ControlButton>

        <div className="mx-2 h-6 w-px bg-border" />

        {isHost ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="relative"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                    {activeRecording ? (
                      <span
                        aria-hidden
                        className="absolute right-1.5 top-1.5 flex h-2 w-2 items-center justify-center"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/70" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More options</TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="end" side="top" className="w-64">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Host tools
              </DropdownMenuLabel>

              {!activeRecording ? (
                <DropdownMenuItem
                  disabled={recordingBusy}
                  onSelect={(event) => {
                    event.preventDefault();
                    setRecordingConfirmOpen(true);
                  }}
                  className="gap-2"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    {recordingBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">Start recording</span>
                    <span className="text-[11px] text-muted-foreground">
                      Captures everyone&apos;s video and audio
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : activeRecording.status === 'STOPPING' ? (
                <DropdownMenuItem
                  disabled
                  className="gap-2 data-[disabled]:opacity-100"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">Stopping recording…</span>
                    <span className="text-[11px] text-muted-foreground">
                      Saving — appears in history when finished
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled={recordingBusy}
                  onSelect={(event) => {
                    event.preventDefault();
                    void stopRecording();
                  }}
                  className="gap-2"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    {recordingBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Square className="h-3.5 w-3.5 fill-current" />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      Stop recording
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-destructive" />
                        REC <span className="font-mono">{recordingElapsed}</span>
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Saves the recording to meeting history
                    </span>
                  </span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  setInfoOpen(true);
                }}
                className="gap-2"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <span className="text-sm">Meeting details</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

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
              Anyone with this link will be asked for permission to join. The host approves every
              guest.
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
              You&apos;ll be removed from the call. The meeting continues for everyone else, and you
              can rejoin while it&apos;s still in progress.
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

      <Dialog open={recordingConfirmOpen} onOpenChange={setRecordingConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Circle className="h-3.5 w-3.5 fill-current" />
              </span>
              Start recording this meeting?
            </DialogTitle>
            <DialogDescription>
              Everyone will see a red <strong>Recording</strong> indicator and hear a chime when it
              starts. The recording is saved to this meeting&apos;s history and only people who
              were in the meeting can view it.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              <span>Captures everyone&apos;s video, screen share, and audio.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              <span>Stops automatically when the meeting ends — you can also stop it manually.</span>
            </li>
          </ul>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecordingConfirmOpen(false)}
              disabled={recordingBusy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void confirmStartRecording();
              }}
              disabled={recordingBusy}
              className="gap-2"
            >
              {recordingBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Circle className="h-4 w-4 fill-current" />
              )}
              {recordingBusy ? 'Starting…' : 'Start recording'}
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
