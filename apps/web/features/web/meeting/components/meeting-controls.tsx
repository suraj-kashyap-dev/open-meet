'use client';

import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import EmojiPicker, {
  EmojiStyle,
  Theme as EmojiPickerTheme,
  type EmojiClickData,
} from 'emoji-picker-react';
import {
  AlertTriangle,
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
  Share2,
  Smile,
  Square,
  Users,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ClientEvent } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@open-meet/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@open-meet/ui/tooltip';
import { useEndMeeting } from '@/features/web/meeting/hooks/use-meetings';
import type { MeetingSocket } from '@/features/web/meeting/hooks/use-socket';
import { recordingApi } from '@/features/web/meeting/services/recording';
import { useActiveMeeting, useChatStore, useRecordingStore } from '@/features/web/meeting/stores';
import { useUIStore } from '@/stores';
import { ApiClientError } from '@/lib/api/client';
import { meetingsApi } from '@/features/web/meeting/services/meetings';

interface Props {
  code: string;
  socket: MeetingSocket | null;
  hostId: string;
  authToken?: string | null;
}

export function MeetingControls({ code, socket, hostId, authToken }: Props) {
  const t = useTranslations('meeting');
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const session = useActiveMeeting((s) => s.session);
  const viewer = session?.code === code ? session.viewer : null;
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
  const lastReactionAtRef = useRef(0);

  const { resolvedTheme } = useTheme();

  const pickerTheme = resolvedTheme === 'dark' ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT;

  const isHost = viewer?.id === hostId;
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
      toast.error(t('toast.toggle-microphone-error', { message: (err as Error).message }));
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
      toast.error(t('toast.toggle-camera-error', { message: (err as Error).message }));
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
      toast.error(t('toast.toggle-screen-error', { message: (err as Error).message }));
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
      toast.error(t('toast.toggle-fullscreen-error'));
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
      const started = await recordingApi.start(code, authToken);
      setActiveRecording(started);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : t('toast.start-recording-error');
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
      await recordingApi.stop(code, authToken);
      // Optimistic clear: the egress takes a few seconds to finalize the
      // MP4 and a few more for the webhook to land, but from the host's
      // point of view the meeting is no longer being recorded. Clear the
      // UI immediately so they can start another one or just move on.
      // The recording will appear in /history as soon as it's processed.
      setActiveRecording(null);
      toast.success(t('toast.recording-saved'), {
        description: t('toast.recording-saved-description'),
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('toast.stop-recording-error');
      toast.error(message);
    } finally {
      setRecordingBusy(false);
    }
  };

  const sendReaction = (emoji: string) => {
    if (!socket) {
      return;
    }

    const now = Date.now();

    if (now - lastReactionAtRef.current < 250) {
      return;
    }

    lastReactionAtRef.current = now;
    socket.emit(ClientEvent.REACTION_SEND, { meetingCode: code, emoji });
  };

  const onCopyLink = async () => {
    const url = `${window.location.origin}/${code}`;

    try {
      await navigator.clipboard.writeText(url);

      setCopied(true);

      toast.success(t('toast.link-copied'));

      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t('toast.copy-link-error'));
    }
  };

  const confirmLeave = async () => {
    setLeaving(true);

    try {
      await meetingsApi.leave(code, authToken);
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
      const message = err instanceof ApiClientError ? err.message : t('toast.end-meeting-error');
      toast.error(message);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <footer className="flex items-center justify-center gap-2 border-t border-border bg-card/80 px-4 py-3 backdrop-blur">
        <ControlButton
          label={micEnabled ? t('controls.mute') : t('controls.unmute')}
          active={!micEnabled}
          onClick={toggleMic}
        >
          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </ControlButton>

        <ControlButton
          label={cameraEnabled ? t('controls.stop-video') : t('controls.start-video')}
          active={!cameraEnabled}
          onClick={toggleCamera}
        >
          {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </ControlButton>

        <ControlButton
          label={isScreenSharing ? t('controls.stop-sharing') : t('controls.share-screen')}
          active={isScreenSharing}
          onClick={toggleScreenShare}
        >
          <MonitorUp className="h-4 w-4" />
        </ControlButton>

        <Popover open={reactionPickerOpen} onOpenChange={setReactionPickerOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" aria-label={t('controls.react')}>
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('controls.react')}</TooltipContent>
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
          label={handRaised ? t('controls.lower-hand') : t('controls.raise-hand')}
          active={handRaised}
          onClick={toggleHand}
        >
          {handRaised ? <HandMetal className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
        </ControlButton>

        <div className="mx-2 h-6 w-px bg-border" />

        <ControlButton
          label={t('controls.chat')}
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
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </ControlButton>

        <ControlButton
          label={t('controls.participants')}
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

        <ControlButton
          label={isFullscreen ? t('controls.exit-full-screen') : t('controls.full-screen')}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </ControlButton>

        <div className="mx-2 h-6 w-px bg-border" />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="relative"
                  aria-label={t('controls.more-options')}
                >
                  <MoreVertical className="h-4 w-4" />
                  {isHost && activeRecording ? (
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
            <TooltipContent>{t('controls.more-options')}</TooltipContent>
          </Tooltip>

          <DropdownMenuContent align="end" side="top" className="w-64">
            {isHost ? (
              <>
                <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('controls.host-tools')}
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
                      <span className="text-sm font-medium">{t('controls.start-recording')}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t('controls.start-recording-description')}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ) : activeRecording.status === 'STOPPING' ? (
                  <DropdownMenuItem disabled className="gap-2 data-disabled:opacity-100">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/10 text-warning">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-sm font-medium">
                        {t('controls.stopping-recording')}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t('controls.stopping-recording-description')}
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
                        {t('controls.stop-recording')}
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                          <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-destructive" />
                          {t('controls.rec', { time: recordingElapsed })}
                        </span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t('controls.stop-recording-description')}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
              </>
            ) : null}

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
              <span className="text-sm">{t('controls.meeting-details')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isHost ? (
          <Button
            variant="destructive"
            onClick={() => setEndAllOpen(true)}
            disabled={endMeeting.isPending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {t('controls.end-for-all')}
          </Button>
        ) : null}
        <Button variant="destructive" onClick={() => setLeaveOpen(true)} className="gap-2">
          <PhoneOff className="h-4 w-4" />
          {t('controls.leave')}
        </Button>
      </footer>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-7 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/25">
              <Share2 className="h-5 w-5" />
            </div>

            <DialogHeader className="space-y-1.5 text-center sm:text-center">
              <DialogTitle className="text-xl">{t('controls.details-title')}</DialogTitle>
              <DialogDescription className="text-balance">
                {t('controls.details-description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-2 px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t('controls.meeting-code')}
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted px-3 py-2.5 font-mono text-sm">
                {code}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={onCopyLink}
                aria-label={t('controls.copy-link')}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button variant="outline" onClick={() => setInfoOpen(false)} className="sm:min-w-24">
              {t('controls.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-7 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
              <PhoneOff className="h-5 w-5" />
            </div>

            <DialogHeader className="space-y-1.5 text-center sm:text-center">
              <DialogTitle className="text-xl">{t('controls.leave-title')}</DialogTitle>
              <DialogDescription className="text-balance">
                {t('controls.leave-description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="mt-4 gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setLeaveOpen(false)}
              disabled={leaving}
              className="sm:min-w-24"
            >
              {t('controls.stay')}
            </Button>
            <Button variant="destructive" onClick={confirmLeave} disabled={leaving}>
              {leaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PhoneOff className="h-4 w-4" />
              )}
              {leaving ? t('controls.leaving') : t('controls.leave-meeting')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={endAllOpen} onOpenChange={setEndAllOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-7 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <DialogHeader className="space-y-1.5 text-center sm:text-center">
              <DialogTitle className="text-xl">{t('controls.end-all-title')}</DialogTitle>
              <DialogDescription className="text-balance">
                {t('controls.end-all-description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <ul className="mx-6 mt-4 space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <li className="flex items-start gap-2 text-foreground/85">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              <span>{t('controls.end-all-point-recordings')}</span>
            </li>
            <li className="flex items-start gap-2 text-foreground/85">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              <span>{t('controls.end-all-point-new-meeting')}</span>
            </li>
          </ul>

          <DialogFooter className="mt-5 gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setEndAllOpen(false)}
              disabled={leaving}
              className="sm:min-w-24"
            >
              {t('controls.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmEndForAll} disabled={leaving}>
              {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              {leaving ? t('controls.ending') : t('controls.end-for-all')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recordingConfirmOpen} onOpenChange={setRecordingConfirmOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-7 text-center">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <span className="absolute inset-0 rounded-2xl bg-destructive/10" />
              <span className="absolute inset-0 rounded-2xl ring-1 ring-destructive/20" />
              <Circle className="relative h-5 w-5 fill-current text-destructive" />
            </div>

            <DialogHeader className="space-y-1.5 text-center sm:text-center">
              <DialogTitle className="text-xl">{t('controls.start-recording-title')}</DialogTitle>
              <DialogDescription className="text-balance">
                {t.rich('controls.start-recording-confirm-description', {
                  strong: (chunks) => (
                    <strong className="font-semibold text-foreground">{chunks}</strong>
                  ),
                })}
              </DialogDescription>
            </DialogHeader>
          </div>

          <ul className="mx-6 mt-4 space-y-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <li className="flex items-start gap-2 text-foreground/85">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              <span>{t('controls.start-recording-point-captures')}</span>
            </li>
            <li className="flex items-start gap-2 text-foreground/85">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              <span>{t('controls.start-recording-point-auto-stop')}</span>
            </li>
          </ul>

          <DialogFooter className="mt-5 gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setRecordingConfirmOpen(false)}
              disabled={recordingBusy}
              className="sm:min-w-24"
            >
              {t('controls.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void confirmStartRecording();
              }}
              disabled={recordingBusy}
            >
              {recordingBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Circle className="h-4 w-4 fill-current" />
              )}
              {recordingBusy ? t('controls.starting') : t('controls.start-recording')}
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
