'use client';

import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  ClientEvent,
  ServerEvent,
  type KnockCancelledPayload,
  type KnockRequestedPayload,
} from '@open-meet/types';

import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import type { MeetingSocket } from '@/features/meeting/hooks/use-socket';
import { useNotification } from '@/hooks/use-notification';
import { useSound } from '@/hooks/use-sound';

interface PendingKnock {
  userId: string;
  name: string;
  avatar: string | null;
  knockedAt: string;
}

interface Props {
  socket: MeetingSocket | null;
  code: string;
}

export function KnockNotifier({ socket, code }: Props) {
  const [pending, setPending] = useState<PendingKnock[]>([]);
  const knockSound = useSound('knock');
  const notification = useNotification();

  useEffect(() => {
    if (! socket) {
      return;
    }

    const onRequested = (payload: KnockRequestedPayload) => {
      setPending((prev) => {
        if (prev.some((p) => p.userId === payload.userId)) {
          return prev;
        }

        return [...prev, payload];
      });
      toast.message(`${payload.name} is asking to join`);
      knockSound.play();
      notification.notify(`${payload.name} wants to join`, {
        body: 'Open the meeting to let them in.',
        tag: `knock-${code}`,
      });
    };

    const onCancelled = (payload: KnockCancelledPayload) => {
      setPending((prev) => prev.filter((p) => p.userId !== payload.userId));
    };

    socket.on(ServerEvent.KNOCK_REQUESTED, onRequested);
    socket.on(ServerEvent.KNOCK_CANCELLED, onCancelled);

    return () => {
      socket.off(ServerEvent.KNOCK_REQUESTED, onRequested);
      socket.off(ServerEvent.KNOCK_CANCELLED, onCancelled);
    };
  }, [socket, code, knockSound, notification]);

  const respond = (userId: string, admit: boolean) => {
    if (! socket) {
      return;
    }

    socket.emit(ClientEvent.MEETING_KNOCK_RESPOND, {
      meetingCode: code,
      userId,
      admit,
    });
    setPending((prev) => prev.filter((p) => p.userId !== userId));
  };

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md flex-col gap-2">
        {pending.map((knock) => (
          <div
            key={knock.userId}
            className="flex items-center gap-3 rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-md"
          >
            <UserAvatar user={knock} size="lg" className="shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{knock.name}</p>
              <p className="text-xs text-muted-foreground">wants to join the meeting</p>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => respond(knock.userId, false)}
                aria-label={`Deny ${knock.name}`}
              >
                <X className="h-4 w-4" />
                Deny
              </Button>
              <Button
                size="sm"
                variant="accent"
                onClick={() => respond(knock.userId, true)}
                aria-label={`Admit ${knock.name}`}
              >
                <Check className="h-4 w-4" />
                Admit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
