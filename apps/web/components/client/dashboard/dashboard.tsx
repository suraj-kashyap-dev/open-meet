'use client';

import {
  ArrowRight,
  Calendar,
  Check,
  Command,
  Copy,
  Hand,
  Keyboard,
  MessageSquare,
  Plus,
  Smile,
  Sparkles,
  Video,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Spotlight } from '@/components/ui/spotlight';
import { useCurrentUser } from '@/hooks/client/use-auth';
import { useCreateMeeting } from '@/hooks/client/use-meetings';
import { ApiClientError } from '@/lib/shared/api';
import { cn } from '@/lib/shared/cn';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut', delay: i * 0.06 },
  }),
};

export function Dashboard() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const createMeeting = useCreateMeeting();
  const [code, setCode] = useState('');

  const onCreate = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});
      router.push(`/meeting/${meeting.code}/lobby`);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Could not create meeting';
      toast.error(message);
    }
  };

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toLowerCase();
    if (! trimmed) {
      toast.error('Enter a meeting code');
      return;
    }
    router.push(`/meeting/${trimmed}/lobby`);
  };

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <main className="relative isolate overflow-hidden pb-24 pt-10 sm:pt-14">
      <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <Spotlight />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-6">
        {/* Hero / greeting */}
        <motion.header
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col gap-3"
        >
          <DateBadge />
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {greetingLabel()},{' '}
            <span className="gradient-text">{firstName}</span>
          </h1>
          <p className="max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
            Pick up where you left off — or start something new. Press{' '}
            <KbdShortcut>⌘K</KbdShortcut> from anywhere to jump in.
          </p>
        </motion.header>

        {/* Primary actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {/* Start new meeting (3 cols wide) */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="md:col-span-3"
          >
            <Card className="group relative flex h-full flex-col overflow-hidden border-border/60 bg-card/50 backdrop-blur transition-all duration-300 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10">
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/15 blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-50"
                aria-hidden
              />
              <CardContent className="flex flex-1 flex-col gap-6 p-7">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/20">
                    <Video className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-success">
                    Instant
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Start a new meeting
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Generate a fresh, sharable link in one click. Bring up to{' '}
                    <span className="font-medium text-foreground">100 people</span>{' '}
                    on the call.
                  </p>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <ShimmerButton
                    type="button"
                    onClick={onCreate}
                    disabled={createMeeting.isPending}
                    className="min-w-[160px]"
                  >
                    {createMeeting.isPending ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                        Creating…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        New meeting
                      </>
                    )}
                  </ShimmerButton>
                  <p className="text-xs text-muted-foreground">
                    No setup. Link expires when the room is empty.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Join with code (2 cols wide) */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="md:col-span-2"
          >
            <Card className="group flex h-full flex-col border-border/60 bg-card/50 backdrop-blur transition-all duration-300 hover:border-foreground/30 hover:shadow-xl">
              <CardContent className="flex flex-1 flex-col gap-5 p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
                  <ArrowRight className="h-5 w-5" />
                </div>

                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Join with a code
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Paste the link or 12-character code you were sent.
                  </p>
                </div>

                <form onSubmit={onJoin} className="mt-auto flex flex-col gap-2">
                  <Label htmlFor="join-code" className="sr-only">
                    Meeting code
                  </Label>
                  <Input
                    id="join-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="abcd-efgh-ijkl"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 font-mono tracking-wide"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    disabled={! code.trim()}
                  >
                    Join meeting
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Secondary row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="md:col-span-2"
          >
            <TipsCard />
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeUp}
          >
            <ShortcutsCard />
          </motion.div>
        </div>
      </section>
    </main>
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

  if (! now) {
    // Empty placeholder so layout is stable before hydration.
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
    icon: <Smile className="h-4 w-4" />,
    title: 'React without interrupting',
    body: 'Drop a 🎉 or 👏 to acknowledge a point without breaking the flow.',
    accent: 'text-warning bg-warning/10 ring-warning/20',
  },
  {
    icon: <Hand className="h-4 w-4" />,
    title: 'Raise your hand',
    body: 'Queue up to speak so quieter voices get heard.',
    accent: 'text-accent bg-accent/10 ring-accent/20',
  },
  {
    icon: <MessageSquare className="h-4 w-4" />,
    title: 'Drop links in chat',
    body: 'Side-channel conversation without derailing the call.',
    accent: 'text-success bg-success/10 ring-success/20',
  },
];

function TipsCard() {
  return (
    <Card className="h-full border-border/60 bg-card/50 backdrop-blur">
      <CardContent className="flex h-full flex-col gap-5 p-7">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Make every call better
          </h3>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TIPS.map((tip) => (
            <li
              key={tip.title}
              className="flex flex-col gap-2 rounded-lg border border-border/50 bg-background/50 p-4 transition-colors hover:border-border"
            >
              <span
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md ring-1',
                  tip.accent,
                )}
              >
                {tip.icon}
              </span>
              <p className="text-sm font-medium leading-tight">{tip.title}</p>
              <p className="text-xs text-muted-foreground">{tip.body}</p>
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
      <CardContent className="flex h-full flex-col gap-5 p-7">
        <div className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Shortcuts
          </h3>
        </div>

        <ul className="flex flex-col gap-3 text-sm">
          <ShortcutRow keys={['⌘', 'K']} label="Open command palette" />
          <ShortcutRow keys={['⌘', 'M']} label="Mute / unmute mic" />
          <ShortcutRow keys={['⌘', 'E']} label="Toggle camera" />
          <ShortcutRow keys={['⌘', 'D']} label="Raise / lower hand" />
        </ul>

        <p className="mt-auto text-xs text-muted-foreground">
          In-call shortcuts will activate after you join a meeting.
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

/* exported helper kept for potential future use (copy meeting code button etc.) */
export function CopyButton({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copied to clipboard');
      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onCopy}
      className={className}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <>
          <Copy className="h-4 w-4" />
          <Command className="sr-only" aria-hidden />
        </>
      )}
    </Button>
  );
}
