'use client';

import { Globe, Lock, MessageSquare, MonitorUp, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { cn } from '@/lib/shared/cn';

interface BentoCardProps {
  className?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  visual?: React.ReactNode;
}

function BentoCard({ className, icon, title, description, visual }: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur transition-all duration-300 hover:border-accent/40 hover:bg-card/70',
        className,
      )}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent">
        {icon}
      </div>
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      {visual ? <div className="mt-6 flex-1">{visual}</div> : null}
    </motion.div>
  );
}

export function FeaturesBento() {
  return (
    <section id="features" className="border-b border-border/40 py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            Features
          </span>
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a remote team actually needs.
          </h2>
          <p className="max-w-xl text-balance text-muted-foreground">
            Battle-tested primitives stitched into a calm, focused experience.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BentoCard
            className="lg:col-span-2"
            icon={<Zap className="h-5 w-5" />}
            title="Sub-100ms latency"
            description="Built on LiveKit's SFU. Audio and video stay in sync, even on flaky Wi-Fi."
            visual={<LatencyVisual />}
          />
          <BentoCard
            icon={<Lock className="h-5 w-5" />}
            title="End-to-end encrypted"
            description="WebRTC + DTLS-SRTP. Your conversations leave nothing for us to read."
          />
          <BentoCard
            icon={<Globe className="h-5 w-5" />}
            title="Open by default"
            description="MIT licensed. Self-host on your own infra or use ours — your call."
          />
          <BentoCard
            className="lg:col-span-2"
            icon={<MessageSquare className="h-5 w-5" />}
            title="Chat, reactions & raise-hand"
            description="Real-time presence with sub-second delivery via Socket.IO + Redis adapter."
            visual={<ChatVisual />}
          />
          <BentoCard
            icon={<MonitorUp className="h-5 w-5" />}
            title="Screen sharing"
            description="Share a tab, a window, or your entire screen. One click."
          />
          <BentoCard
            icon={<Users className="h-5 w-5" />}
            title="Host controls"
            description="End the call for everyone, see who's talking, lower hands — built in."
          />
          <BentoCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Keyboard-first"
            description="⌘K opens the command palette. Start, join, switch theme — never touch the mouse."
          />
        </div>
      </div>
    </section>
  );
}

function LatencyVisual() {
  return (
    <div className="relative h-32 overflow-hidden rounded-md border border-border/50 bg-background/60">
      <svg
        viewBox="0 0 400 120"
        className="h-full w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="lat-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,80 L40,75 L80,82 L120,60 L160,72 L200,50 L240,68 L280,40 L320,62 L360,38 L400,55 L400,120 L0,120 Z"
          fill="url(#lat-grad)"
        />
        <path
          d="M0,80 L40,75 L80,82 L120,60 L160,72 L200,50 L240,68 L280,40 L320,62 L360,38 L400,55"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-3 text-[10px] font-mono text-muted-foreground">
        <span>p50 38ms</span>
        <span>p95 82ms</span>
        <span>p99 110ms</span>
      </div>
    </div>
  );
}

function ChatVisual() {
  const messages = [
    { from: 'Ada', text: 'shipping the patch now', accent: false },
    { from: 'You', text: '✨', accent: true },
    { from: 'Linus', text: 'merge looks clean', accent: false },
  ];
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-background/60 p-3">
      {messages.map((m, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2 text-xs',
            m.accent ? 'justify-end' : '',
          )}
        >
          {! m.accent ? (
            <span className="font-medium text-foreground">{m.from}</span>
          ) : null}
          <span
            className={cn(
              'rounded-md px-2.5 py-1.5',
              m.accent
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-foreground/90',
            )}
          >
            {m.text}
          </span>
        </div>
      ))}
    </div>
  );
}
