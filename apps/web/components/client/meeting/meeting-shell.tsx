'use client';

import { useRoomContext } from '@livekit/components-react';
import { useEffect } from 'react';
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

import { useCurrentUser } from '@/hooks/client/use-auth';
import { useMeetingSocket } from '@/hooks/client/use-socket';
import { useChatStore, useMeetingStore, useUIStore } from '@/store/client';
import { cn } from '@/lib/shared/cn';
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
    if (! socket) {
      return;
    }

    socket.emit(ClientEvent.MEETING_JOIN, { meetingCode: code });

    socket.on(ServerEvent.CHAT_MESSAGE, (msg: ChatMessagePayload) => {
      addMessage(msg);
    });
    socket.on(ServerEvent.REACTION_RECEIVED, (r: ReactionReceivedPayload) => {
      pushReaction(r.emoji, r.senderName);
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
  }, [socket, code, addMessage, pushReaction, raiseHand, lowerHand, room]);

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
          aria-hidden={! sidebarOpen}
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
