'use client';

import { Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ClientEvent } from '@open-meet/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentUser } from '@/hooks/client/use-auth';
import type { MeetingSocket } from '@/hooks/client/use-socket';
import { useChatStore } from '@/store/client';

interface Props {
  code: string;
  socket: MeetingSocket | null;
  onClose: () => void;
}

export function ChatPanel({ code, socket, onClose }: Props) {
  const { data: user } = useCurrentUser();
  const messages = useChatStore((s) => s.messages);

  const [text, setText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const send = () => {
    const content = text.trim();

    if (! content || ! socket) {
      return;
    }

    socket.emit(ClientEvent.CHAT_SEND, { meetingCode: code, content });
    setText('');
  };

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold tracking-tight">In-call messages</h2>
          <p className="text-xs text-muted-foreground">
            Messages stay only for the duration of the call.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close chat"
          className="-mr-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1 px-4" ref={scrollRef as never}>
        <ul className="space-y-3 py-4">
          {messages.length === 0 ? (
            <li className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Be the first to say something
            </li>
          ) : (
            messages.map((m) => {
              const isMe = m.sender.id === user?.id;

              return (
                <li key={m.id} className="space-y-1">
                  <div
                    className={`flex items-baseline gap-2 text-xs text-muted-foreground ${
                      isMe ? 'justify-end' : ''
                    }`}
                  >
                    <span className="font-medium text-foreground">{m.sender.name}</span>
                    <time>{new Date(m.sentAt).toLocaleTimeString()}</time>
                  </div>

                  <p
                    className={`rounded-md px-3 py-2 text-sm ${
                      isMe
                        ? 'ml-auto max-w-[80%] bg-accent text-accent-foreground'
                        : 'mr-auto max-w-[80%] bg-muted text-foreground'
                    }`}
                  >
                    {m.content}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-border px-4 py-3"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message"
          maxLength={2000}
          autoComplete="off"
        />

        <Button type="submit" size="icon" variant="accent" disabled={! text.trim()}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
