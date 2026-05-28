'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import {
  ChatNamespace,
  type ChatClientToServerEvents,
  type ChatServerToClientEvents,
} from '@open-meet/types';

import { env } from '@/lib/env';

export type ChatSocket = Socket<ChatServerToClientEvents, ChatClientToServerEvents>;

/**
 * App-wide, long-lived connection to the `/chat` namespace (cookie auth). Unlike
 * the per-meeting socket, this stays open across navigation so unread badges and
 * presence work everywhere. Consumed by a single ChatSocketProvider.
 */
export function useChatSocket(enabled: boolean): ChatSocket | null {
  const [socket, setSocket] = useState<ChatSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      return;
    }

    const next: ChatSocket = io(`${env.NEXT_PUBLIC_WS_URL}${ChatNamespace}`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    setSocket(next);

    return () => {
      next.disconnect();
      setSocket(null);
    };
  }, [enabled]);

  return socket;
}
