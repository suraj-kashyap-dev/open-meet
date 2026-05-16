'use client';

import { useRoomContext } from '@livekit/components-react';
import { useEffect, useState } from 'react';
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

import { useMeetingSocket } from '@/hooks/use-socket';
import { useChatStore, useMeetingStore } from '@/stores';
import { ChatPanel } from './chat-panel';
import { MeetingControls } from './meeting-controls';
import { MeetingTimer } from './meeting-timer';
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
  const setMeeting = useMeetingStore((s) => s.setMeeting);
  const raiseHand = useMeetingStore((s) => s.raiseHand);
  const lowerHand = useMeetingStore((s) => s.lowerHand);
  const addMessage = useChatStore((s) => s.add);
  const pushReaction = useChatStore((s) => s.pushReaction);
  const [hostEnded, setHostEnded] = useState(false);

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
      setHostEnded(true);
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
      <div className="flex-1 overflow-hidden bg-background p-4">
        <VideoGrid />
      </div>

      <MeetingTimer startedAt={meeting.startedAt ?? meeting.createdAt} hostEnded={hostEnded} />
      <MeetingControls code={code} socket={socket} hostId={meeting.hostId} />

      <ReactionOverlay />
      <ChatPanel code={code} socket={socket} />
      <ParticipantsPanel />
    </div>
  );
}
