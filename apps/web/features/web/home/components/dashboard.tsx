'use client';

import {
  ArrowRight,
  CalendarClock,
  Check,
  Crown,
  Download,
  ExternalLink,
  Hash,
  History,
  Info,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  Share2,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { MeetingStatus, type MeetingHistoryItemDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import { Card, CardContent } from '@open-meet/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { ShimmerButton } from '@open-meet/ui/shimmer-button';
import { Link } from '@/i18n/navigation';
import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { ScheduleMeetingDialog } from '@/features/web/home/components/schedule-meeting-dialog';
import { useHistoryList } from '@/features/web/history/hooks/use-history';
import { useCreateMeeting, useUpcomingMeetings } from '@/features/web/meeting/hooks/use-meetings';
import { meetingsApi } from '@/features/web/meeting/services/meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { ApiClientError } from '@/lib/api/client';
import type { UpcomingMeetingDto } from '@open-meet/types';
import { cn } from '@open-meet/ui/cn';

export function Dashboard() {
  const t = useTranslations('home');
  const nav = useNavigateTransition();
  const { data: user } = useCurrentUser();
  const createMeeting = useCreateMeeting();
  const history = useHistoryList(1, 5);
  const upcoming = useUpcomingMeetings();
  const [code, setCode] = useState('');
  const [intent, setIntent] = useState<'create' | 'join' | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const onCreate = async () => {
    setIntent('create');

    try {
      const meeting = await createMeeting.mutateAsync({});
      nav.push(`/${meeting.code}/lobby`);
    } catch (err) {
      setIntent(null);

      const message = err instanceof ApiClientError ? err.message : t('toast.create-error');

      toast.error(message);
    }
  };

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = code.trim().toLowerCase();

    if (!trimmed) {
      toast.error(t('toast.enter-code'));
      return;
    }

    setIntent('join');
    nav.push(`/${trimmed}/lobby`);
  };

  void user;
  const recent = history.data?.items ?? [];
  const totalMeetings = history.data?.total ?? 0;

  return (
    <div className="min-h-full bg-card">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-6">
        <ActionCard
          code={code}
          onCodeChange={setCode}
          onCreate={onCreate}
          onSchedule={() => setScheduleOpen(true)}
          onJoin={onJoin}
          isCreating={intent === 'create' && (createMeeting.isPending || nav.isNavigating)}
          isJoining={intent === 'join' && nav.isNavigating}
        />

        <UpcomingMeetings
          items={upcoming.data ?? []}
          isLoading={upcoming.isLoading}
          onSchedule={() => setScheduleOpen(true)}
        />

        <RecentMeetings items={recent} total={totalMeetings} isLoading={history.isLoading} />
      </div>

      <ScheduleMeetingDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  );
}

interface ActionCardProps {
  code: string;
  onCodeChange: (value: string) => void;
  onCreate: () => void | Promise<void>;
  onSchedule: () => void;
  onJoin: (e: React.FormEvent) => void;
  isCreating: boolean;
  isJoining: boolean;
}

function ActionCard({
  code,
  onCodeChange,
  onCreate,
  onSchedule,
  onJoin,
  isCreating,
  isJoining,
}: ActionCardProps) {
  const t = useTranslations('home');

  return (
    <Card className="overflow-hidden border-border/60 bg-card">
      <CardContent className="grid gap-px overflow-hidden bg-border p-0 sm:grid-cols-2">
        <div className="flex flex-col gap-5 bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
              <Video className="h-4 w-4" />
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              {t('instant.badge')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t('instant.eyebrow')}
            </p>

            <h2 className="text-2xl font-semibold tracking-tight">{t('instant.title')}</h2>

            <p className="text-sm text-muted-foreground">{t('instant.description')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              {t('instant.capacity')}
            </span>
            <span className="h-3 w-px bg-border" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-success" />
              {t('instant.secure')}
            </span>
          </div>

          <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center">
            <ShimmerButton
              type="button"
              onClick={onCreate}
              disabled={isCreating}
              className="w-full sm:w-auto sm:min-w-45"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('instant.creating')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t('instant.new-meeting')}
                </>
              )}
            </ShimmerButton>

            <Button
              type="button"
              variant="outline"
              onClick={onSchedule}
              className="w-full sm:w-auto"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {t('instant.schedule-for-later')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-5 bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border/60">
              <ArrowRight className="h-4 w-4" />
            </span>

            <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t('join.badge')}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t('join.eyebrow')}
            </p>

            <h2 className="text-2xl font-semibold tracking-tight">{t('join.title')}</h2>

            <p className="text-sm text-muted-foreground">{t('join.description')}</p>
          </div>

          <form onSubmit={onJoin} className="mt-auto flex flex-col gap-2 sm:flex-row">
            <Label htmlFor="join-code" className="sr-only">
              {t('join.code-label')}
            </Label>

            <div className="relative flex-1">
              <Hash
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="join-code"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="abcd-efgh-ijkl"
                autoComplete="off"
                spellCheck={false}
                className="h-11 pl-9 font-mono tracking-wide"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!code.trim() || isJoining}
              className="sm:min-w-27.5"
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('join.joining')}
                </>
              ) : (
                <>
                  {t('join.join')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

interface UpcomingMeetingsProps {
  items: UpcomingMeetingDto[];
  isLoading: boolean;
  onSchedule: () => void;
}

function UpcomingMeetings({ items, isLoading, onSchedule }: UpcomingMeetingsProps) {
  const t = useTranslations('home');

  if (!isLoading && items.length === 0) {
    return null;
  }

  const soonCount = items.filter((i) => minutesUntil(i.scheduledFor) <= 15).length;
  const total = items.length;

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent/6 blur-3xl"
      />

      <CardContent className="relative flex flex-col gap-5 p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-semibold tracking-tight">{t('upcoming.title')}</h3>

              {soonCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  {t('upcoming.starting-soon', { count: soonCount })}
                </span>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              {total > 0 ? t('upcoming.count', { count: total }) : t('upcoming.empty')}
            </p>
          </div>

          <Button size="sm" variant="ghost" className="text-xs" onClick={onSchedule}>
            <CalendarClock className="h-3.5 w-3.5" />
            {t('upcoming.schedule')}
          </Button>
        </div>

        {isLoading ? (
          <UpcomingSkeleton />
        ) : (
          <ul className="-mx-2 flex flex-col">
            {items.map((item) => (
              <UpcomingRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingRow({ item }: { item: UpcomingMeetingDto }) {
  const t = useTranslations('home');
  const when = new Date(item.scheduledFor);
  const title = item.title ?? t('upcoming.default-title', { date: formatScheduledDate(when) });
  const repeats = item.recurrence ? recurrenceLabel(item.recurrence, t) : null;
  const isStartingSoon = minutesUntil(item.scheduledFor) <= 15;

  return (
    <li className="group/row relative isolate flex items-center gap-2 rounded-xl px-2.5 py-3 transition-colors duration-200 hover:bg-muted/50 sm:px-3">
      <Link
        href={`/${item.code}/lobby`}
        aria-label={t('upcoming.join-aria', { title })}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-muted ring-1 ring-border transition-colors',
            isStartingSoon && 'bg-accent/10 ring-accent/30',
          )}
        >
          <span
            className={cn(
              'text-[9px] font-semibold uppercase tracking-wider text-muted-foreground',
              isStartingSoon && 'text-accent',
            )}
          >
            {when.toLocaleString(undefined, { month: 'short' })}
          </span>

          <span
            className={cn(
              'text-sm font-semibold leading-none tabular-nums',
              isStartingSoon && 'text-accent',
            )}
          >
            {when.getDate()}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold tracking-tight">{title}</p>

            {item.isHost ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                <Crown className="h-3 w-3" />
                {t('upcoming.host')}
              </span>
            ) : null}

            {repeats ? (
              <span className="inline-flex shrink-0 items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {repeats}
              </span>
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-mono text-[11px] tracking-tight text-foreground/65">
              {item.code}
            </span>

            <span aria-hidden>·</span>

            <span>{formatScheduledDate(when)}</span>

            {item.durationMin ? (
              <>
                <span className="hidden sm:inline" aria-hidden>
                  ·
                </span>

                <span className="hidden tabular-nums sm:inline-flex">
                  {formatDurationShort(item.durationMin, t)}
                </span>
              </>
            ) : null}

            {item.inviteeCount > 0 ? (
              <>
                <span className="hidden sm:inline" aria-hidden>
                  ·
                </span>

                <span className="hidden tabular-nums sm:inline-flex">
                  {t('upcoming.invited', { count: item.inviteeCount })}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="relative flex h-8 shrink-0 items-center">
        <div
          aria-hidden
          className="flex items-center gap-2 pr-2 transition-opacity duration-200 group-hover/row:pointer-events-none group-hover/row:opacity-0"
        >
          {isStartingSoon ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              {t('upcoming.soon')}
            </span>
          ) : (
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              {formatTimeUntil(when, t)}
            </span>
          )}
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100">
          <RowIcsButton code={item.code} />

          <Link
            href={`/${item.code}/lobby`}
            aria-label={t('upcoming.join')}
            title={t('upcoming.join')}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
              isStartingSoon && 'text-accent hover:bg-accent/10 hover:text-accent',
            )}
          >
            <ArrowRight className="h-4 w-4 transition-transform group-hover/row:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}

function RowIcsButton({ code }: { code: string }) {
  const t = useTranslations('home');

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={t('upcoming.download-ics-aria')}
      title={t('upcoming.add-to-calendar')}
      className="h-8 w-8 shrink-0 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <a
        href={meetingsApi.icsUrl(code)}
        download={`${code}.ics`}
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </Button>
  );
}

function UpcomingSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {Array.from({ length: 2 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-2 py-3">
          <span className="shimmer h-10 w-10 rounded-md" />

          <div className="flex flex-1 flex-col gap-2">
            <span className="shimmer h-3 w-1/2 rounded" />

            <span className="shimmer h-2.5 w-1/3 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface RecentMeetingsProps {
  items: MeetingHistoryItemDto[];
  total: number;
  isLoading: boolean;
}

function RecentMeetings({ items, total, isLoading }: RecentMeetingsProps) {
  const t = useTranslations('home');
  const liveCount = items.filter((i) => i.status === MeetingStatus.ACTIVE).length;

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/50 backdrop-blur">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-accent/6 blur-3xl"
      />

      <CardContent className="relative flex flex-col gap-5 p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-semibold tracking-tight">{t('recent.title')}</h3>

              {liveCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                  </span>
                  {t('recent.live', { count: liveCount })}
                </span>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              {total > 0
                ? t('recent.count', { shown: Math.min(items.length, total), total })
                : t('recent.empty')}
            </p>
          </div>

          {items.length > 0 ? (
            <Button asChild size="sm" variant="ghost" className="text-xs">
              <Link href="/history">
                {t('recent.view-all')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <RecentSkeleton />
        ) : items.length === 0 ? (
          <EmptyRecent />
        ) : (
          <ul className="-mx-2 flex flex-col">
            {items.map((item) => (
              <RecentRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentRow({ item }: { item: MeetingHistoryItemDto }) {
  const t = useTranslations('home');
  const rejoinable = item.status === MeetingStatus.ACTIVE || item.status === MeetingStatus.WAITING;
  const isLive = item.status === MeetingStatus.ACTIVE;

  const primaryHref = rejoinable ? `/${item.code}/lobby` : `/history/${item.code}`;
  const actionLabel = rejoinable ? t('recent.rejoin') : t('recent.open');
  const title =
    item.title ??
    t('recent.default-title', { date: formatShortDate(item.startedAt ?? item.createdAt) });

  return (
    <li className="group/row relative isolate flex items-center gap-2 rounded-xl px-2.5 py-3 transition-colors duration-200 hover:bg-muted/50 sm:px-3">
      <Link
        href={primaryHref}
        aria-label={t('recent.action-aria', { action: actionLabel, title })}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <StatusIndicator status={item.status} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold tracking-tight">{title}</p>

            {item.isHost ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                <Crown className="h-3 w-3" />
                {t('recent.host')}
              </span>
            ) : null}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-mono text-[11px] tracking-tight text-foreground/65">
              {item.code}
            </span>

            <span aria-hidden>·</span>

            <span>{formatShortDate(item.startedAt ?? item.createdAt)}</span>

            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>

            <span className="hidden tabular-nums sm:inline-flex">
              {t('recent.people', { count: item.participantCount })}
            </span>

            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>

            <span className="hidden tabular-nums sm:inline-flex">
              {isLive ? t('recent.ongoing') : formatDuration(item.durationMinutes, t)}
            </span>
          </div>
        </div>
      </Link>

      <div className="relative flex h-8 shrink-0 items-center">
        <div
          aria-hidden
          className="flex items-center gap-2 pr-2 transition-opacity duration-200 group-hover/row:pointer-events-none group-hover/row:opacity-0"
        >
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              {t('recent.live-label')}
            </span>
          ) : (
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              {formatRelativeTime(item.startedAt ?? item.createdAt, t)}
            </span>
          )}
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100">
          <RowCopyButton code={item.code} />

          <RowMoreMenu item={item} />

          <Link
            href={primaryHref}
            aria-label={actionLabel}
            title={actionLabel}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground',
              isLive && 'text-success hover:bg-success/10 hover:text-success',
            )}
          >
            <ArrowRight className="h-4 w-4 transition-transform group-hover/row:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}

function StatusIndicator({ status }: { status: MeetingStatus }) {
  const t = useTranslations('home');

  if (status === MeetingStatus.ACTIVE) {
    return (
      <span
        className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center"
        aria-label={t('recent.status-live')}
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
      </span>
    );
  }

  if (status === MeetingStatus.WAITING) {
    return (
      <span
        className="relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
        aria-label={t('recent.status-waiting')}
      />
    );
  }

  return (
    <span
      className="relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/30 shadow-[0_0_0_3px_rgba(161,161,170,0.12)] transition-colors group-hover/row:bg-muted-foreground/60"
      aria-label={t('recent.status-ended')}
    />
  );
}

function RowCopyButton({ code }: { code: string }) {
  const t = useTranslations('home');
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${code}`);
      setCopied(true);
      toast.success(t('recent.copy-link'));

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      toast.error(t('recent.copy-link-error'));
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onCopy}
      aria-label={t('recent.copy-link-aria')}
      title={t('recent.copy-link-aria')}
      className="h-8 w-8 shrink-0 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Link2 className="h-3.5 w-3.5" />}
    </Button>
  );
}

function RowMoreMenu({ item }: { item: MeetingHistoryItemDto }) {
  const t = useTranslations('home');

  const buildUrl = () =>
    typeof window !== 'undefined' ? `${window.location.origin}/${item.code}` : `/${item.code}`;

  const onCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      toast.success(t('recent.code-copied'));
    } catch {
      toast.error(t('recent.code-copy-error'));
    }
  };

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildUrl());
      toast.success(t('recent.copy-link'));
    } catch {
      toast.error(t('recent.copy-link-error'));
    }
  };

  const onShare = async () => {
    const url = buildUrl();
    const text = t('recent.share-text');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: item.title ?? t('recent.share-fallback-title'), text, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}: ${url}`);
      toast.success(t('recent.invite-copied'));
    } catch {
      toast.error(t('recent.share-error'));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('recent.more-actions')}
          title={t('recent.more-actions')}
          className="h-8 w-8 shrink-0 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {item.code}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={`/${item.code}`} className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5" />
            {t('recent.open-meeting')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={`/history/${item.code}`} className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5" />
            {t('recent.view-details')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={onCopyCode}>
          <Hash className="h-3.5 w-3.5" />
          {t('recent.copy-code')}
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onCopyLink}>
          <Link2 className="h-3.5 w-3.5" />
          {t('recent.copy-link-item')}
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onShare}>
          <Share2 className="h-3.5 w-3.5" />
          {t('recent.share-invite')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecentSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-2 py-3">
          <span className="shimmer h-10 w-10 rounded-md" />

          <div className="flex flex-1 flex-col gap-2">
            <span className="shimmer h-3 w-1/2 rounded" />

            <span className="shimmer h-2.5 w-1/3 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyRecent() {
  const t = useTranslations('home');

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <History className="h-4 w-4" />
      </span>

      <p className="text-sm font-medium">{t('recent.empty-title')}</p>

      <p className="max-w-xs text-xs text-muted-foreground">{t('recent.empty-body')}</p>
    </div>
  );
}

type Translator = (key: string, values?: Record<string, number | string>) => string;

function formatShortDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(iso: string | null, t: Translator): string {
  if (!iso) {
    return t('relative.none');
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);

  if (min < 1) {
    return t('relative.just-now');
  }

  if (min < 60) {
    return t('relative.minutes-ago', { count: min });
  }

  const hr = Math.round(min / 60);

  if (hr < 24) {
    return t('relative.hours-ago', { count: hr });
  }

  const days = Math.round(hr / 24);

  if (days < 7) {
    return t('relative.days-ago', { count: days });
  }

  if (days < 30) {
    return t('relative.weeks-ago', { count: Math.round(days / 7) });
  }

  if (days < 365) {
    return t('relative.months-ago', { count: Math.round(days / 30) });
  }

  return t('relative.years-ago', { count: Math.round(days / 365) });
}

function formatDuration(min: number | null, t: Translator): string {
  if (min === null) {
    return t('relative.none');
  }

  if (min < 60) {
    return t('duration.minutes', { count: min });
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0
    ? t('duration.hours', { count: h })
    : t('duration.hours-minutes', { hours: h, minutes: m });
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

function formatTimeUntil(d: Date, t: Translator): string {
  const diffMs = d.getTime() - Date.now();

  if (diffMs <= 0) {
    return t('until.now');
  }

  const min = Math.round(diffMs / 60_000);

  if (min < 60) {
    return t('until.minutes', { count: min });
  }

  const hr = Math.round(min / 60);

  if (hr < 24) {
    return t('until.hours', { count: hr });
  }

  const days = Math.round(hr / 24);

  if (days < 7) {
    return t('until.days', { count: days });
  }

  if (days < 30) {
    return t('until.weeks', { count: Math.round(days / 7) });
  }

  return t('until.months', { count: Math.round(days / 30) });
}

function formatScheduledDate(d: Date): string {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDurationShort(min: number, t: Translator): string {
  if (min < 60) {
    return t('duration.minutes-long', { count: min });
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0
    ? t('duration.hours', { count: h })
    : t('duration.hours-minutes', { hours: h, minutes: m });
}

function recurrenceLabel(rrule: string, t: Translator): string | null {
  const freq = rrule.match(/FREQ=([A-Z]+)/);

  if (!freq) {
    return t('recurrence.repeats');
  }

  switch (freq[1]) {
    case 'DAILY':
      return t('recurrence.daily');
    case 'WEEKLY':
      return t('recurrence.weekly');
    case 'MONTHLY':
      return t('recurrence.monthly');
    case 'YEARLY':
      return t('recurrence.yearly');
    default:
      return t('recurrence.repeats');
  }
}
