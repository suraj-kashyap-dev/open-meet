'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { ClientToServerEvents, ServerToClientEvents } from '@open-meet/types';
import { SocketNamespace } from '@open-meet/types';

import { env } from '@/lib/env';

export type MeetingSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useMeetingSocket(
  enabled: boolean = true,
  authToken?: string | null,
): { socket: MeetingSocket | null } {
  const [socket, setSocket] = useState<MeetingSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const url = `${env.NEXT_PUBLIC_WS_URL}${SocketNamespace}`;
    const next: MeetingSocket = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: authToken ? { token: authToken } : undefined,
    });

    setSocket(next);

    return () => {
      next.disconnect();
      setSocket(null);
    };
  }, [authToken, enabled]);

  return { socket };
}
