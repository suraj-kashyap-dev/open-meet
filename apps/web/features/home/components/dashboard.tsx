'use client';

import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Crown,
  History,
  Keyboard,
  Loader2,
  Plus,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { MeetingStatus, type MeetingHistoryItemDto } from '@open-meet/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Spotlight } from '@/components/ui/spotlight';
import { useCurrentUser } from '@/features/auth/hooks/use-auth';
import { useHistoryList } from '@/features/history/hooks/use-history';
import { useCreateMeeting } from '@/features/meeting/hooks/use-meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { ApiClientError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

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
  const [code, setCode] = useState('');

  const onCreate = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});
      nav.push(`/${meeting.code}/lobby`);
    } catch (err) {
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
            <KbdShortcut>⌘K</KbdShortcut> from anywhere to search.
          </p>
        </motion.header>

        <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp}>
          <ActionCard
            code={code}
            onCodeChange={setCode}
            onCreate={onCreate}
            onJoin={onJoin}
            isCreating={createMeeting.isPending || nav.isNavigating}
            isJoining={nav.isNavigating && !createMeeting.isPending}
          />
        </motion.div>

        <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp}>
          <RecentMeetings items={recent} total={totalMeetings} isLoading={history.isLoading} />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <motion.div initial="hidden" animate="visible" custom={3} variants={fadeUp}>
            <TipsCard />
          </motion.div>

          <motion.div initial="hidden" animate="visible" custom={4} variants={fadeUp}>
            <ShortcutsCard />
          </motion.div>
        </div>
      </section>
    </main>
  );
}

interface ActionCardProps {
  code: string;
  onCodeChange: (value: string) => void;
  onCreate: () => void | Promise<void>;
  onJoin: (e: React.FormEvent) => void;
  isCreating: boolean;
  isJoining: boolean;
}

function ActionCard({
  code,
  onCodeChange,
  onCreate,
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

      <CardContent className="relative grid gap-8 p-7 md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-0 md:p-0">
        <div className="flex flex-col justify-between gap-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/20">
              <Video className="h-5 w-5" />
            </div>

            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-success">
              Instant · up to 100
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Start a new meeting</h2>

            <p className="text-sm text-muted-foreground">
              A fresh, shareable room. No setup — the link expires once the room is empty.
            </p>
          </div>

          <ShimmerButton
            type="button"
            onClick={onCreate}
            disabled={isCreating}
            className="w-full sm:w-auto sm:min-w-[180px]"
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
        </div>

        <div className="relative hidden self-stretch md:block" aria-hidden>
          <div className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-border" />

          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            or
          </span>
        </div>

        <div className="flex h-px items-center md:hidden" aria-hidden>
          <div className="h-px flex-1 bg-border" />

          <span className="mx-3 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            or
          </span>

          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col justify-between gap-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
              <ArrowRight className="h-5 w-5" />
            </div>

            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Have a code?
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Join with a code</h2>

            <p className="text-sm text-muted-foreground">
              Paste the 12-character code your host shared with you.
            </p>
          </div>

          <form onSubmit={onJoin} className="flex flex-col gap-2 sm:flex-row">
            <Label htmlFor="join-code" className="sr-only">
              Meeting code
            </Label>

            <Input
              id="join-code"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              placeholder="abcd-efgh-ijkl"
              autoComplete="off"
              spellCheck={false}
              className="h-11 font-mono tracking-wide"
            />

            <Button
              type="submit"
              variant="outline"
              size="lg"
              disabled={!code.trim() || isJoining}
              className="sm:min-w-[110px]"
            >
              {isJoining ? 'Joining…' : 'Join'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentMeetingsProps {
  items: MeetingHistoryItemDto[];
  total: number;
  isLoading: boolean;
}

function RecentMeetings({ items, total, isLoading }: RecentMeetingsProps) {
  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur">
      <CardContent className="flex flex-col gap-5 p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-accent" />

            <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Pick up where you left off
            </h3>

            {total > 0 ? (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                {total.toLocaleString()}
              </span>
            ) : null}
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
          <ul className="flex flex-col divide-y divide-border/60">
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

  const primaryHref = rejoinable ? `/${item.code}/lobby` : `/history/${item.code}`;
  const actionLabel = rejoinable ? 'Rejoin' : 'Open';
  const title = item.title ?? `Meeting on ${formatShortDate(item.startedAt ?? item.createdAt)}`;

  return (
    <li className="group/row relative flex items-center gap-1">
      <Link
        href={primaryHref}
        aria-label={`${actionLabel} ${title}`}
        className="flex flex-1 items-center gap-4 rounded-md px-2 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted ring-1 ring-border">
          <Video className="h-4 w-4 text-muted-foreground" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{title}</p>

            <StatusPill status={item.status} />

            {item.isHost ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-warning">
                <Crown className="h-3 w-3" />
                Host
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <span className="font-mono">{item.code}</span>
            <span className="mx-1.5">·</span>
            {formatShortDate(item.startedAt ?? item.createdAt)}
          </p>
        </div>

        <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Users className="h-3.5 w-3.5" />
            {item.participantCount}
          </span>

          <span className="inline-flex items-center gap-1 tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(item.durationMinutes)}
          </span>
        </div>

        <span
          className={cn(
            'hidden shrink-0 items-center gap-1 text-xs font-medium sm:inline-flex',
            rejoinable ? 'text-accent' : 'text-muted-foreground',
          )}
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/row:translate-x-0.5" />
        </span>
      </Link>

      {rejoinable ? <CopyLinkButton code={item.code} /> : null}
    </li>
  );
}

function StatusPill({ status }: { status: MeetingStatus }) {
  if (status === MeetingStatus.ACTIVE) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        Live
      </span>
    );
  }

  if (status === MeetingStatus.WAITING) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
        Waiting
      </span>
    );
  }

  return null;
}

function CopyLinkButton({ code }: { code: string }) {
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
      className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100"
    >
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
    </Button>
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

const TIPS: { icon: React.ReactNode; title: string; body: string; accent: string }[] = [
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
    <Card className="h-full border-border/60 bg-card/50 backdrop-blur">
      <CardContent className="flex h-full flex-col gap-4 p-7">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />

          <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Make every call better
          </h3>
        </div>

        <ul className="flex flex-col gap-2">
          {TIPS.map((tip) => (
            <li
              key={tip.title}
              className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:border-border"
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1',
                  tip.accent,
                )}
              >
                {tip.icon}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{tip.title}</p>

                <p className="mt-0.5 text-xs text-muted-foreground">{tip.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ShortcutsCard() {
  return (
    <Card className="h-full border-border/60 bg-card/50 backdrop-blur">
      <CardContent className="flex h-full flex-col gap-4 p-7">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-accent" />

          <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Shortcuts
          </h3>
        </div>

        <ul className="flex flex-col gap-2.5 text-sm">
          <ShortcutRow keys={['⌘', 'K']} label="Open command palette" />
          <ShortcutRow keys={['⌘', 'M']} label="Mute / unmute mic" />
          <ShortcutRow keys={['⌘', 'E']} label="Toggle camera" />
          <ShortcutRow keys={['⌘', 'D']} label="Raise / lower hand" />
        </ul>

        <p className="mt-auto text-xs text-muted-foreground">
          In-call shortcuts activate once you join a meeting.
        </p>
      </CardContent>
    </Card>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-foreground/90">{label}</span>

      <span className="flex items-center gap-1">
        {keys.map((k) => (
          <KbdShortcut key={k}>{k}</KbdShortcut>
        ))}
      </span>
    </li>
  );
}

function KbdShortcut({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center gap-1 rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-foreground">
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
