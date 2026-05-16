'use client';

import { motion } from 'motion/react';
import { Hand, Mic, MicOff, MonitorUp, PhoneOff, Smile, Users, Video } from 'lucide-react';

import { cn } from '@/lib/cn';

interface Tile {
  name: string;
  initial: string;
  speaking?: boolean;
  muted?: boolean;
  hand?: boolean;
  host?: boolean;
  hue: string;
}

const TILES: Tile[] = [
  { name: 'Ada Lovelace', initial: 'A', speaking: true, host: true, hue: 'from-blue-500/40 to-blue-500/10' },
  { name: 'Linus Torvalds', initial: 'L', hue: 'from-violet-500/40 to-violet-500/10' },
  { name: 'Grace Hopper', initial: 'G', muted: true, hue: 'from-amber-500/40 to-amber-500/10' },
  { name: 'Alan Kay', initial: 'A', hand: true, hue: 'from-emerald-500/40 to-emerald-500/10' },
];

/**
 * Decorative in-meeting mockup for the marketing hero. Pure CSS — no real media stream.
 */
export function ProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
      className="relative w-full"
    >
      {/* outer glow */}
      <div className="absolute -inset-x-12 -inset-y-8 -z-10 bg-gradient-to-br from-accent/20 via-transparent to-accent/10 blur-3xl" aria-hidden />

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-2xl backdrop-blur-xl">
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-border/60 bg-background/60 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </div>
          <div className="hidden font-mono text-[11px] text-muted-foreground sm:block">
            open-meet · abcd-efgh-ijkl · 00:14:32
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live
          </div>
        </div>

        {/* video grid */}
        <div className="grid grid-cols-2 gap-2 p-3 sm:p-4">
          {TILES.map((tile, i) => (
            <motion.div
              key={tile.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.25 + i * 0.06 }}
              className={cn(
                'relative aspect-video overflow-hidden rounded-lg border border-border/40',
                tile.speaking && 'ring-2 ring-accent ring-offset-2 ring-offset-card',
              )}
            >
              <div className={cn('absolute inset-0 bg-gradient-to-br', tile.hue)} aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background/40 text-2xl font-medium text-foreground/90 backdrop-blur sm:h-20 sm:w-20">
                  {tile.initial}
                </div>
              </div>

              {/* name pill */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-background/70 px-2 py-1 text-[11px] font-medium backdrop-blur">
                {tile.muted ? (
                  <MicOff className="h-3 w-3 text-destructive" />
                ) : (
                  <Mic className="h-3 w-3 text-success" />
                )}
                <span>{tile.name}</span>
                {tile.host ? (
                  <span className="rounded-sm bg-foreground/10 px-1 text-[9px] uppercase tracking-wider text-foreground/80">
                    Host
                  </span>
                ) : null}
              </div>

              {tile.hand ? (
                <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-warning text-background shadow-md">
                  <Hand className="h-3.5 w-3.5" />
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>

        {/* controls */}
        <div className="flex items-center justify-center gap-2 border-t border-border/60 bg-background/50 px-4 py-3">
          <MockBtn icon={<Mic className="h-3.5 w-3.5" />} active />
          <MockBtn icon={<Video className="h-3.5 w-3.5" />} active />
          <MockBtn icon={<MonitorUp className="h-3.5 w-3.5" />} />
          <MockBtn icon={<Smile className="h-3.5 w-3.5" />} />
          <MockBtn icon={<Hand className="h-3.5 w-3.5" />} />
          <span className="mx-2 hidden h-5 w-px bg-border sm:block" aria-hidden />
          <MockBtn icon={<Users className="h-3.5 w-3.5" />} count={4} />
          <span className="mx-2 hidden h-5 w-px bg-border sm:block" aria-hidden />
          <MockBtn icon={<PhoneOff className="h-3.5 w-3.5" />} variant="destructive" label="Leave" />
        </div>
      </div>

      {/* floating reaction */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.7 }}
        animate={{ opacity: 1, y: -10, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="absolute bottom-16 right-8 hidden items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur sm:flex"
      >
        <span className="text-xl">🎉</span>
        <span className="text-xs text-muted-foreground">Grace</span>
      </motion.div>
    </motion.div>
  );
}

function MockBtn({
  icon,
  active,
  variant,
  label,
  count,
}: {
  icon: React.ReactNode;
  active?: boolean;
  variant?: 'destructive';
  label?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      className={cn(
        'relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors',
        variant === 'destructive'
          ? 'bg-destructive text-destructive-foreground'
          : active
            ? 'bg-destructive/15 text-destructive'
            : 'bg-muted/60 text-muted-foreground',
      )}
    >
      {icon}
      {label ? <span>{label}</span> : null}
      {count !== undefined ? (
        <span className="rounded-sm bg-background/40 px-1 text-[10px]">{count}</span>
      ) : null}
    </button>
  );
}
