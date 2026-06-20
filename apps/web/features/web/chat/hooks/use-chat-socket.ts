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

let sharedSocket: ChatSocket | null = null;
let sharedConsumers = 0;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

function createChatSocket(): ChatSocket {
  return io(`${env.NEXT_PUBLIC_WS_URL}${ChatNamespace}`, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
}

function retainChatSocket(): ChatSocket {
  if (releaseTimer !== null) {
    clearTimeout(releaseTimer);

    releaseTimer = null;
  }

  sharedConsumers += 1;

  sharedSocket ??= createChatSocket();

  return sharedSocket;
}

function releaseChatSocket(): void {
  if (sharedConsumers > 0) {
    sharedConsumers -= 1;
  }

  if (sharedConsumers > 0 || !sharedSocket || releaseTimer !== null) {
    return;
  }

  const socketToClose = sharedSocket;

  releaseTimer = setTimeout(() => {
    releaseTimer = null;

    if (sharedConsumers > 0 || sharedSocket !== socketToClose) {
      return;
    }

    sharedSocket = null;

    socketToClose.disconnect();
  }, 0);
}

export function useChatSocket(enabled: boolean): ChatSocket | null {
  const [socket, setSocket] = useState<ChatSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);

      return;
    }

    const next = retainChatSocket();

    setSocket(next);

    return () => {
      releaseChatSocket();
    };
  }, [enabled]);

  return socket;
}
