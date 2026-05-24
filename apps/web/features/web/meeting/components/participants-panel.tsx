'use client';

import { useParticipants } from '@livekit/components-react';
import { Crown, Hand, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import { ScrollArea } from '@open-meet/ui/scroll-area';
import { parseParticipantMetadata } from '@/features/web/meeting/lib/participant-metadata';
import { useMeetingStore } from '@/features/web/meeting/stores';

interface Props {
  onClose: () => void;
}

export function ParticipantsPanel({ onClose }: Props) {
  const t = useTranslations('meeting');
  const participants = useParticipants();
  const meeting = useMeetingStore((s) => s.meeting);
  const raisedHands = useMeetingStore((s) => s.raisedHands);

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold tracking-tight">
            {t('participants.title', { count: participants.length })}
          </h2>
          <p className="text-xs text-muted-foreground">{t('participants.description')}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('participants.close')}
          className="-mr-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1 px-4">
        <ul className="space-y-2 py-4">
          {participants.map((p) => {
            const isHost = p.identity === meeting?.hostId;
            const hasHand = Boolean(raisedHands[p.identity]);
            const { avatar } = parseParticipantMetadata(p.metadata);

            return (
              <li
                key={p.identity}
                className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    user={{ name: p.name ?? p.identity, avatar }}
                    size="md"
                    fallbackClassName="bg-muted text-muted-foreground"
                  />

                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {p.name ?? p.identity}
                      {p.isLocal ? ` ${t('participants.you')}` : ''}
                    </span>

                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isHost ? (
                        <span className="inline-flex items-center gap-1">
                          <Crown className="h-3 w-3 text-warning" />
                          {t('participants.host')}
                        </span>
                      ) : null}
                      {hasHand ? (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <Hand className="h-3 w-3" />
                          {t('participants.hand-raised')}
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
    </div>
  );
}
