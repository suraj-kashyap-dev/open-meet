'use client';

import {
  ArrowRight,
  Calendar,
  CalendarClock,
  Check,
  Crown,
  Download,
  ExternalLink,
  Hash,
  History,
  Info,
  Keyboard,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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
import { Spotlight } from '@open-meet/ui/spotlight';
import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { ScheduleMeetingDialog } from '@/features/web/home/components/schedule-meeting-dialog';
import { useHistoryList } from '@/features/web/history/hooks/use-history';
import { useCreateMeeting, useUpcomingMeetings } from '@/features/web/meeting/hooks/use-meetings';
import { meetingsApi } from '@/features/web/meeting/services/meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { ApiClientError } from '@/lib/api/client';
import type { UpcomingMeetingDto } from '@open-meet/types';
import { cn } from '@open-meet/ui/cn';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut', delay: i * 0.06 },
  }),
};

export function Dashboard() {
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

      const message = err instanceof ApiClientError ? err.message : 'Could not create meeting';

      toast.error(message);
    }
  };

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = code.trim().toLowerCase();

    if (!trimmed) {
      toast.error('Enter a meeting code');
      return;
    }

    setIntent('join');
    nav.push(`/${trimmed}/lobby`);
  };

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const recent = history.data?.items ?? [];
  const totalMeetings = history.data?.total ?? 0;

  return (
    <main className="relative isolate overflow-hidden pb-24 pt-10 sm:pt-14">
      <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <Spotlight />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <motion.header
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col gap-3"
        >
          <DateBadge />

          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {greetingLabel()}, <span className="gradient-text">{firstName}</span>
          </h1>

          <p className="max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
            Spin up a room in one click or hop into one with a code. Press{' '}
            <KbdShortcut>⌘ K</KbdShortcut> from anywhere to search.
          </p>
        </motion.header>

        <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp}>
          <ActionCard
            code={code}
            onCodeChange={setCode}
            onCreate={onCreate}
            onSchedule={() => setScheduleOpen(true)}
            onJoin={onJoin}
            isCreating={intent === 'create' && (createMeeting.isPending || nav.isNavigating)}
            isJoining={intent === 'join' && nav.isNavigating}
          />
        </motion.div>

        <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp}>
          <UpcomingMeetings
            items={upcoming.data ?? []}
            isLoading={upcoming.isLoading}
            onSchedule={() => setScheduleOpen(true)}
          />
        </motion.div>

        <motion.div initial="hidden" animate="visible" custom={3} variants={fadeUp}>
          <RecentMeetings items={recent} total={totalMeetings} isLoading={history.isLoading} />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <motion.div initial="hidden" animate="visible" custom={4} variants={fadeUp}>
            <TipsCard />
          </motion.div>

          <motion.div initial="hidden" animate="visible" custom={5} variants={fadeUp}>
            <ShortcutsCard />
          </motion.div>
        </div>
      </section>

      <ScheduleMeetingDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </main>
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
  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />

      <CardContent className="relative grid gap-0 p-0 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
              <Video className="h-4 w-4" />
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Instant
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Start fresh
            </p>

            <h2 className="text-2xl font-semibold tracking-tight">Start a new meeting</h2>

            <p className="text-sm text-muted-foreground">
              A fresh, shareable room. No setup — the link expires once the room is empty.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Up to 100
            </span>
            <span className="h-3 w-px bg-border" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-success" />
              End-to-end secure
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
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  New meeting
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
              Schedule for later
            </Button>
          </div>
        </div>

        <div className="relative hidden self-stretch md:block" aria-hidden>
          <div className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-border" />

          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            or
          </span>
        </div>

        <div className="flex h-px items-center px-6 md:hidden" aria-hidden>
          <div className="h-px flex-1 bg-border" />

          <span className="mx-3 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            or
          </span>

          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border/60">
              <ArrowRight className="h-4 w-4" />
            </span>

            <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Have a code
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Join in
            </p>

            <h2 className="text-2xl font-semibold tracking-tight">Join with a code</h2>

            <p className="text-sm text-muted-foreground">
              Paste the 12-character code your host shared with you.
            </p>
          </div>

          <form onSubmit={onJoin} className="mt-auto flex flex-col gap-2 sm:flex-row">
            <Label htmlFor="join-code" className="sr-only">
              Meeting code
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
                  Joining…
                </>
              ) : (
                <>
                  Join
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
              <h3 className="text-xl font-semibold tracking-tight">Coming up</h3>

              {soonCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  {soonCount} starting soon
                </span>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              {total > 0
                ? `Showing your next ${total} scheduled meeting${total === 1 ? '' : 's'}`
                : 'Your scheduled meetings will appear here'}
            </p>
          </div>

          <Button size="sm" variant="ghost" className="text-xs" onClick={onSchedule}>
            <CalendarClock className="h-3.5 w-3.5" />
            Schedule
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
  const when = new Date(item.scheduledFor);
  const title = item.title ?? `Meeting on ${formatScheduledDate(when)}`;
  const repeats = item.recurrence ? recurrenceLabel(item.recurrence) : null;
  const isStartingSoon = minutesUntil(item.scheduledFor) <= 15;

  return (
    <li className="group/row relative isolate flex items-center gap-2 rounded-xl px-2.5 py-3 transition-colors duration-200 hover:bg-muted/50 sm:px-3">
      <Link
        href={`/${item.code}/lobby`}
        aria-label={`Join ${title}`}
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
                Host
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
                  {formatDurationShort(item.durationMin)}
                </span>
              </>
            ) : null}

            {item.inviteeCount > 0 ? (
              <>
                <span className="hidden sm:inline" aria-hidden>
                  ·
                </span>

                <span className="hidden tabular-nums sm:inline-flex">
                  {item.inviteeCount} invited
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
              Soon
            </span>
          ) : (
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              {formatTimeUntil(when)}
            </span>
          )}
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100">
          <RowIcsButton code={item.code} />

          <Link
            href={`/${item.code}/lobby`}
            aria-label="Join"
            title="Join"
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
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label="Download .ics"
      title="Add to calendar"
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
              <h3 className="text-xl font-semibold tracking-tight">History</h3>

              {liveCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                  </span>
                  {liveCount} live
                </span>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              {total > 0
                ? `Showing your last ${Math.min(items.length, total)} of ${total.toLocaleString()}`
                : 'Your meetings will appear here'}
            </p>
          </div>

          {items.length > 0 ? (
            <Button asChild size="sm" variant="ghost" className="text-xs">
              <Link href="/history">
                View all
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
  const rejoinable = item.status === MeetingStatus.ACTIVE || item.status === MeetingStatus.WAITING;
  const isLive = item.status === MeetingStatus.ACTIVE;

  const primaryHref = rejoinable ? `/${item.code}/lobby` : `/history/${item.code}`;
  const actionLabel = rejoinable ? 'Rejoin' : 'Open';
  const title = item.title ?? `Meeting on ${formatShortDate(item.startedAt ?? item.createdAt)}`;

  return (
    <li className="group/row relative isolate flex items-center gap-2 rounded-xl px-2.5 py-3 transition-colors duration-200 hover:bg-muted/50 sm:px-3">
      <Link
        href={primaryHref}
        aria-label={`${actionLabel} ${title}`}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <StatusIndicator status={item.status} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold tracking-tight">{title}</p>

            {item.isHost ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                <Crown className="h-3 w-3" />
                Host
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
              {item.participantCount} {item.participantCount === 1 ? 'person' : 'people'}
            </span>

            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>

            <span className="hidden tabular-nums sm:inline-flex">
              {isLive ? 'ongoing' : formatDuration(item.durationMinutes)}
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
              Live
            </span>
          ) : (
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              {formatRelativeTime(item.startedAt ?? item.createdAt)}
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
  if (status === MeetingStatus.ACTIVE) {
    return (
      <span
        className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center"
        aria-label="Live"
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
        aria-label="Waiting"
      />
    );
  }

  return (
    <span
      className="relative inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/30 shadow-[0_0_0_3px_rgba(161,161,170,0.12)] transition-colors group-hover/row:bg-muted-foreground/60"
      aria-label="Ended"
    />
  );
}

function RowCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${code}`);
      setCopied(true);
      toast.success('Meeting link copied');

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onCopy}
      aria-label="Copy meeting link"
      title="Copy meeting link"
      className="h-8 w-8 shrink-0 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Link2 className="h-3.5 w-3.5" />}
    </Button>
  );
}

function RowMoreMenu({ item }: { item: MeetingHistoryItemDto }) {
  const buildUrl = () =>
    typeof window !== 'undefined' ? `${window.location.origin}/${item.code}` : `/${item.code}`;

  const onCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(item.code);
      toast.success('Meeting code copied');
    } catch {
      toast.error('Could not copy code');
    }
  };

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildUrl());
      toast.success('Meeting link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const onShare = async () => {
    const url = buildUrl();
    const text = 'Join my meeting on Open Meet';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: item.title ?? 'Open Meet', text, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}: ${url}`);
      toast.success('Invite copied to clipboard');
    } catch {
      toast.error('Could not share meeting');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="More actions"
          title="More actions"
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
            Open meeting
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href={`/history/${item.code}`} className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5" />
            View details
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={onCopyCode}>
          <Hash className="h-3.5 w-3.5" />
          Copy code
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onCopyLink}>
          <Link2 className="h-3.5 w-3.5" />
          Copy link
        </DropdownMenuItem>

        <DropdownMenuItem onSelect={onShare}>
          <Share2 className="h-3.5 w-3.5" />
          Share invite
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
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <History className="h-4 w-4" />
      </span>

      <p className="text-sm font-medium">No meetings yet</p>

      <p className="max-w-xs text-xs text-muted-foreground">
        Your first meeting will show up here as soon as you host or join one.
      </p>
    </div>
  );
}

function DateBadge() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const id = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  if (!now) {
    return <span className="h-5 w-40" aria-hidden />;
  }

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <Calendar className="h-3.5 w-3.5" />

      <span>
        {dayName}, {monthDay}
      </span>

      <span className="mx-1 h-3 w-px bg-border" aria-hidden />

      <span className="font-mono">{time}</span>
    </span>
  );
}

const TIPS: {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
}[] = [
  {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    title: 'React without interrupting',
    body: 'Drop a 🎉 or 👏 to acknowledge a point without breaking flow.',
    accent: 'text-warning bg-warning/10 ring-warning/20',
  },
  {
    icon: <Users className="h-3.5 w-3.5" />,
    title: 'Raise your hand',
    body: 'Queue up to speak so quieter voices get heard.',
    accent: 'text-accent bg-accent/10 ring-accent/20',
  },
  {
    icon: <History className="h-3.5 w-3.5" />,
    title: 'Chat is preserved',
    body: 'Every message and shared file is saved to your meeting history.',
    accent: 'text-success bg-success/10 ring-success/20',
  },
];

function TipsCard() {
  return (
    <Card className="relative h-full overflow-hidden border-border/60 bg-card/60 backdrop-blur">
      <CardContent className="relative flex h-full flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
            <Sparkles className="h-4 w-4" />
          </span>

          <div className="flex flex-col leading-tight">
            <h3 className="text-base font-semibold tracking-tight">Quick tips</h3>

            <p className="text-xs text-muted-foreground">Small habits, smoother calls.</p>
          </div>
        </div>

        <ul className="flex flex-1 flex-col">
          {TIPS.map((tip, i) => (
            <li
              key={tip.title}
              className={cn(
                'group/tip flex items-start gap-3.5 py-3.5',
                i > 0 && 'border-t border-border/50',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform group-hover/tip:scale-105',
                  tip.accent,
                )}
              >
                {tip.icon}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight tracking-tight text-foreground">
                  {tip.title}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tip.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const SHORTCUTS: { keys: string[]; label: string; scope: 'global' | 'in-call' }[] = [
  { keys: ['⌘', 'K'], label: 'Open command palette', scope: 'global' },
  { keys: ['⌘', 'M'], label: 'Mute / unmute mic', scope: 'in-call' },
  { keys: ['⌘', 'E'], label: 'Toggle camera', scope: 'in-call' },
  { keys: ['⌘', 'D'], label: 'Raise / lower hand', scope: 'in-call' },
];

function ShortcutsCard() {
  return (
    <Card className="relative h-full overflow-hidden border-border/60 bg-card/60 backdrop-blur">
      <CardContent className="relative flex h-full flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
            <Keyboard className="h-4 w-4" />
          </span>

          <div className="flex flex-col leading-tight">
            <h3 className="text-base font-semibold tracking-tight">Shortcuts</h3>

            <p className="text-xs text-muted-foreground">Move through the app without a mouse.</p>
          </div>
        </div>

        <ul className="flex flex-1 flex-col">
          {SHORTCUTS.map((shortcut, i) => (
            <li
              key={shortcut.label}
              className={cn(
                'flex items-center justify-between gap-3 py-2.5',
                i > 0 && 'border-t border-border/50',
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm text-foreground/90">{shortcut.label}</span>

                {shortcut.scope === 'in-call' ? (
                  <span className="hidden rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:inline-flex">
                    in call
                  </span>
                ) : null}
              </div>

              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((k) => (
                  <KbdShortcut key={k}>{k}</KbdShortcut>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function KbdShortcut({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-card px-1.5 font-mono text-[10px] font-semibold text-foreground shadow-[0_1px_0_0_var(--color-border)]">
      {children}
    </kbd>
  );
}

function greetingLabel(): string {
  const hour = new Date().getHours();

  if (hour < 5) {
    return 'Up late';
  }

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

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

function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return '—';
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60_000);

  if (min < 1) {
    return 'just now';
  }

  if (min < 60) {
    return `${min}m ago`;
  }

  const hr = Math.round(min / 60);

  if (hr < 24) {
    return `${hr}h ago`;
  }

  const days = Math.round(hr / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  if (days < 30) {
    return `${Math.round(days / 7)}w ago`;
  }

  if (days < 365) {
    return `${Math.round(days / 30)}mo ago`;
  }

  return `${Math.round(days / 365)}y ago`;
}

function formatDuration(min: number | null): string {
  if (min === null) {
    return '—';
  }

  if (min < 60) {
    return `${min}m`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function minutesUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
}

function formatTimeUntil(d: Date): string {
  const diffMs = d.getTime() - Date.now();

  if (diffMs <= 0) {
    return 'now';
  }

  const min = Math.round(diffMs / 60_000);

  if (min < 60) {
    return `in ${min}m`;
  }

  const hr = Math.round(min / 60);

  if (hr < 24) {
    return `in ${hr}h`;
  }

  const days = Math.round(hr / 24);

  if (days < 7) {
    return `in ${days}d`;
  }

  if (days < 30) {
    return `in ${Math.round(days / 7)}w`;
  }

  return `in ${Math.round(days / 30)}mo`;
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

function formatDurationShort(min: number): string {
  if (min < 60) {
    return `${min} min`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function recurrenceLabel(rrule: string): string | null {
  const freq = rrule.match(/FREQ=([A-Z]+)/);

  if (!freq) {
    return 'Repeats';
  }

  switch (freq[1]) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'YEARLY':
      return 'Yearly';
    default:
      return 'Repeats';
  }
}
