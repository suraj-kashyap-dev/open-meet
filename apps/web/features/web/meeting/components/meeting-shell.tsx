'use client';

import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import {
  ClientEvent,
  ServerEvent,
  type ChatMessagePayload,
  type HandLoweredPayload,
  type HandRaisedPayload,
  type MeetingDto,
  type MeetingEndedPayload,
  type ReactionReceivedPayload,
  type RecordingStartedPayload,
  type RecordingStoppedPayload,
} from '@open-meet/types';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useMeetingSocket } from '@/features/web/meeting/hooks/use-socket';
import { recordingApi } from '@/features/web/meeting/services/recording';
import { useChatStore, useMeetingStore, useRecordingStore } from '@/features/web/meeting/stores';
import { useNotification } from '@/hooks/use-notification';
import { useSound } from '@/hooks/use-sound';
import { cn } from '@open-meet/ui/cn';
import { useUIStore } from '@/stores';
import { ChatPanel } from './chat-panel';
import { KnockNotifier } from './knock-notifier';
import { MeetingControls } from './meeting-controls';
import { MeetingTopBar } from './meeting-top-bar';
import { ParticipantsPanel } from './participants-panel';
import { ReactionOverlay } from './reaction-overlay';
import { RecordingBanner } from './recording-banner';
import { VideoGrid } from './video-grid';

interface Props {
  code: string;
  meeting: MeetingDto;
}

export function MeetingShell({ code, meeting }: Props) {
  const t = useTranslations('meeting');
  const room = useRoomContext();
  const { socket } = useMeetingSocket();
  const { data: user } = useCurrentUser();
  const isHost = user?.id === meeting.hostId;
  const setMeeting = useMeetingStore((s) => s.setMeeting);
  const raiseHand = useMeetingStore((s) => s.raiseHand);
  const lowerHand = useMeetingStore((s) => s.lowerHand);
  const addMessage = useChatStore((s) => s.add);
  const pushReaction = useChatStore((s) => s.pushReaction);

  const isChatOpen = useChatStore((s) => s.isOpen);
  const setChatOpen = useChatStore((s) => s.setOpen);
  const isParticipantsOpen = useUIStore((s) => s.participantsOpen);
  const setParticipantsOpen = useUIStore((s) => s.setParticipantsOpen);

  const joinSound = useSound('join');
  const leaveSound = useSound('leave');
  const messageSound = useSound('message');
  const reactionSound = useSound('reaction');
  const recordingSound = useSound('recording');
  const setActiveRecording = useRecordingStore((s) => s.setActive);
  const resetRecording = useRecordingStore((s) => s.reset);
  const notification = useNotification();
  const settledAt = useRef<number>(Date.now());

  const activePanel: 'chat' | 'participants' | null = isChatOpen
    ? 'chat'
    : isParticipantsOpen
      ? 'participants'
      : null;
  const sidebarOpen = activePanel !== null;

  useEffect(() => {
    setMeeting(meeting);
  }, [meeting, setMeeting]);

  useEffect(() => {
    const controller = new AbortController();

    recordingApi
      .active(code, controller.signal)
      .then((state) => {
        if (state.recording) {
          setActiveRecording(state.recording);
        }
      })
      .catch(() => {
        // ignore — banner stays hidden if probe fails
      });

    return () => {
      controller.abort();
      resetRecording();
    };
  }, [code, setActiveRecording, resetRecording]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.emit(ClientEvent.MEETING_JOIN, { meetingCode: code });

    socket.on(ServerEvent.CHAT_MESSAGE, (msg: ChatMessagePayload) => {
      addMessage(msg);
      if (msg.sender.id !== user?.id) {
        messageSound.play();
        notification.notify(msg.sender.name || t('toast.new-message'), {
          body: msg.content,
          tag: `chat-${code}`,
        });
      }
    });
    socket.on(ServerEvent.REACTION_RECEIVED, (r: ReactionReceivedPayload) => {
      pushReaction(r.emoji, r.senderName);
      if (r.senderId !== user?.id) {
        reactionSound.play();
      }
    });
    socket.on(ServerEvent.HAND_RAISED, (h: HandRaisedPayload) => {
      raiseHand(h.userId, h.name);
      toast.message(t('toast.hand-raised', { name: h.name }));
    });
    socket.on(ServerEvent.HAND_LOWERED, (h: HandLoweredPayload) => {
      lowerHand(h.userId);
    });
    socket.on(ServerEvent.MEETING_ENDED, (_payload: MeetingEndedPayload) => {
      toast.message(t('toast.host-ended'));
      void room.disconnect();
    });
    socket.on(ServerEvent.RECORDING_STARTED, (payload: RecordingStartedPayload) => {
      setActiveRecording(payload.recording);
      recordingSound.play();
      const starter = payload.recording.startedByName ?? t('toast.default-host');
      toast.message(t('toast.recording-started', { name: starter }), {
        description: t('toast.recording-started-description'),
      });
    });
    socket.on(ServerEvent.RECORDING_STOPPED, (payload: RecordingStoppedPayload) => {
      setActiveRecording(null);
      if (payload.recording.status === 'COMPLETED') {
        toast.success(t('toast.recording-stopped'));
      } else if (payload.recording.status === 'FAILED') {
        toast.error(
          t('toast.recording-failed', {
            error: payload.recording.error ?? t('toast.recording-failed-unknown'),
          }),
        );
      }
    });

    return () => {
      socket.off(ServerEvent.CHAT_MESSAGE);
      socket.off(ServerEvent.REACTION_RECEIVED);
      socket.off(ServerEvent.HAND_RAISED);
      socket.off(ServerEvent.HAND_LOWERED);
      socket.off(ServerEvent.MEETING_ENDED);
      socket.off(ServerEvent.RECORDING_STARTED);
      socket.off(ServerEvent.RECORDING_STOPPED);
      socket.emit(ClientEvent.MEETING_LEAVE, { meetingCode: code });
    };
  }, [
    socket,
    code,
    addMessage,
    pushReaction,
    raiseHand,
    lowerHand,
    room,
    user?.id,
    messageSound,
    reactionSound,
    notification,
    recordingSound,
    setActiveRecording,
    t,
  ]);

  // LiveKit participant join / leave sounds. Suppress for the first ~1.2s
  // after mount so existing participants firing as "Connected" on initial
  // sync don't unleash a flurry of chimes.
  useEffect(() => {
    if (!room) {
      return;
    }
    settledAt.current = Date.now() + 1200;

    const onConnected = () => {
      if (Date.now() >= settledAt.current) {
        joinSound.play();
      }
    };
    const onDisconnected = () => {
      if (Date.now() >= settledAt.current) {
        leaveSound.play();
      }
    };

    room.on(RoomEvent.ParticipantConnected, onConnected);
    room.on(RoomEvent.ParticipantDisconnected, onDisconnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, onConnected);
      room.off(RoomEvent.ParticipantDisconnected, onDisconnected);
    };
  }, [room, joinSound, leaveSound]);

  return (
    <div className="relative flex h-full flex-col">
      <MeetingTopBar code={code} canEdit={isHost} />

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 bg-background p-4">
          <RecordingBanner />
          <VideoGrid />
        </div>

        <aside
          className={cn(
            'shrink-0 overflow-hidden border-l border-border bg-card',
            'transition-[width] duration-200 ease-out',
            sidebarOpen ? 'w-full sm:w-96' : 'w-0',
          )}
          aria-hidden={!sidebarOpen}
        >
          <div className="h-full w-full sm:w-96">
            {activePanel === 'chat' ? (
              <ChatPanel code={code} socket={socket} onClose={() => setChatOpen(false)} />
            ) : null}

            {activePanel === 'participants' ? (
              <ParticipantsPanel onClose={() => setParticipantsOpen(false)} />
            ) : null}
          </div>
        </aside>
      </div>

      <MeetingControls code={code} socket={socket} hostId={meeting.hostId} />

      <ReactionOverlay />
      {isHost ? <KnockNotifier socket={socket} code={code} /> : null}
    </div>
  );
}
