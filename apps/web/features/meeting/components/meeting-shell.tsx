'use client';

import { useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
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
} from '@open-meet/types';

import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useMeetingSocket } from '@/features/meeting/hooks/use-socket';
import { useChatStore, useMeetingStore } from '@/features/meeting/stores';
import { useNotification } from '@/hooks/use-notification';
import { useSound } from '@/hooks/use-sound';
import { cn } from '@/lib/cn';
import { useUIStore } from '@/stores';
import { ChatPanel } from './chat-panel';
import { KnockNotifier } from './knock-notifier';
import { MeetingControls } from './meeting-controls';
import { ParticipantsPanel } from './participants-panel';
import { ReactionOverlay } from './reaction-overlay';
import { VideoGrid } from './video-grid';

interface Props {
  code: string;
  meeting: MeetingDto;
}

export function MeetingShell({ code, meeting }: Props) {
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
    if (!socket) {
      return;
    }

    socket.emit(ClientEvent.MEETING_JOIN, { meetingCode: code });

    socket.on(ServerEvent.CHAT_MESSAGE, (msg: ChatMessagePayload) => {
      addMessage(msg);
      if (msg.sender.id !== user?.id) {
        messageSound.play();
        notification.notify(msg.sender.name || 'New message', {
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
      toast.message(`✋ ${h.name} raised their hand`);
    });
    socket.on(ServerEvent.HAND_LOWERED, (h: HandLoweredPayload) => {
      lowerHand(h.userId);
    });
    socket.on(ServerEvent.MEETING_ENDED, (_payload: MeetingEndedPayload) => {
      toast.message('The host ended the meeting');
      void room.disconnect();
    });

    return () => {
      socket.off(ServerEvent.CHAT_MESSAGE);
      socket.off(ServerEvent.REACTION_RECEIVED);
      socket.off(ServerEvent.HAND_RAISED);
      socket.off(ServerEvent.HAND_LOWERED);
      socket.off(ServerEvent.MEETING_ENDED);
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
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 bg-background p-4">
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
