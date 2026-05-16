'use client';

import { useParticipants } from '@livekit/components-react';
import { Crown, Hand, Mic, MicOff, Video, VideoOff } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMeetingStore, useUIStore } from '@/stores';

export function ParticipantsPanel() {
  const isOpen = useUIStore((s) => s.participantsOpen);
  const setOpen = useUIStore((s) => s.setParticipantsOpen);
  const participants = useParticipants();
  const meeting = useMeetingStore((s) => s.meeting);
  const raisedHands = useMeetingStore((s) => s.raisedHands);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Participants ({participants.length})</SheetTitle>
          <SheetDescription>People currently in this meeting</SheetDescription>
        </SheetHeader>

        <ScrollArea className="-mx-6 mt-4 flex-1 px-6">
          <ul className="space-y-2 pb-4">
            {participants.map((p) => {
              const initials = (p.name ?? '?')
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const isHost = p.identity === meeting?.hostId;
              const hasHand = Boolean(raisedHands[p.identity]);
              return (
                <li
                  key={p.identity}
                  className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {p.name ?? p.identity}
                        {p.isLocal ? ' (you)' : ''}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isHost ? (
                          <span className="inline-flex items-center gap-1">
                            <Crown className="h-3 w-3 text-warning" />
                            Host
                          </span>
                        ) : null}
                        {hasHand ? (
                          <span className="inline-flex items-center gap-1 text-warning">
                            <Hand className="h-3 w-3" />
                            Hand raised
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {p.isMicrophoneEnabled ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4 text-destructive" />
                    )}
                    {p.isCameraEnabled ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
