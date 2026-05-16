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

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { MeetingSocket } from '@/hooks/use-socket';

interface PendingKnock {
  userId: string;
  name: string;
  avatar: string | null;
  knockedAt: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

interface Props {
  socket: MeetingSocket | null;
  code: string;
}

export function KnockNotifier({ socket, code }: Props) {
  const [pending, setPending] = useState<PendingKnock[]>([]);

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
  }, [socket]);

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
            <Avatar className="h-10 w-10 shrink-0">
              {knock.avatar ? (
                <AvatarImage src={knock.avatar} alt={knock.name} />
              ) : null}
              <AvatarFallback className="bg-accent/15 text-xs font-semibold text-accent">
                {initialsOf(knock.name)}
              </AvatarFallback>
            </Avatar>

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
