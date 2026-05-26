'use client';

import { Loader2, UserMinus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import {
  useAdminMeetingDetail,
  useKickParticipant,
} from '@/features/meetings/hooks/use-admin-meetings';
import { cn } from '@open-meet/ui/cn';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  meetingId: string | null;
  onClose: () => void;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MeetingDetailDialog({ meetingId, onClose }: Props) {
  const t = useTranslations('meetings.detail');
  const tStatus = useTranslations('meetings.status');
  const { data, isLoading } = useAdminMeetingDetail(meetingId);
  const kick = useKickParticipant();
  const [kicking, setKicking] = useState<string | null>(null);

  const onKick = async (userId: string, name: string) => {
    if (!data) {
      return;
    }

    setKicking(userId);

    try {
      await kick.mutateAsync({ meetingId: data.id, userId });
      toast.success(t('kick-success', { name }));
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('kick-error', { name });
      toast.error(message);
    } finally {
      setKicking(null);
    }
  };

  return (
    <Dialog open={Boolean(meetingId)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="break-words">
            {data ? (
              <>
                <span className="font-mono">{data.code}</span>
                {data.title ? ` · ${data.title}` : null}
                {' · '}
                {t('hosted-by', { host: data.hostName })}
              </>
            ) : isLoading ? (
              t('loading')
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <section className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Stat label={t('stats.status')} value={tStatus(data.status.toLowerCase())} />
              <Stat label={t('stats.active-now')} value={data.activeParticipantCount.toString()} />
              <Stat
                label={t('stats.total-participants')}
                value={data.participantCount.toString()}
              />
              <Stat label={t('stats.messages')} value={data.messageCount.toString()} />
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('participants')}
              </h3>
              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                {data.participants.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {t('no-participants')}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.participants.map((p) => {
                      const isActive = p.leftAt === null;

                      return (
                        <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                          <UserAvatar user={{ name: p.name, avatar: p.avatar }} size="sm" />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {p.name}
                              {p.role === 'HOST' ? (
                                <span className="ms-2 inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">
                                  {t('host-badge')}
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                          </div>

                          <div className="text-end text-[10px] text-muted-foreground">
                            <p>{t('joined', { time: formatTimestamp(p.joinedAt) })}</p>
                            {p.leftAt ? (
                              <p>{t('left', { time: formatTimestamp(p.leftAt) })}</p>
                            ) : null}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'text-destructive hover:bg-destructive/10',
                              !isActive && 'opacity-30',
                            )}
                            disabled={!isActive || kicking === p.userId}
                            onClick={() => onKick(p.userId, p.name)}
                            aria-label={t('kick-aria', { name: p.name })}
                          >
                            {kicking === p.userId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserMinus className="h-3.5 w-3.5" />
                            )}
                            {t('kick')}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}
