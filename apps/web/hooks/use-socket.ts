'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { ClientToServerEvents, ServerToClientEvents } from '@open-meet/types';
import { SocketNamespace } from '@open-meet/types';

import { env } from '@/lib/env';

export type MeetingSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useMeetingSocket(enabled: boolean = true): { socket: MeetingSocket | null } {
  const socketRef = useRef<MeetingSocket | null>(null);

  useEffect(() => {
    if (! enabled) {
      return;
    }

    const url = `${env.NEXT_PUBLIC_WS_URL}${SocketNamespace}`;
    const socket: MeetingSocket = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  return { socket: socketRef.current };
}
