'use client';

import { motion, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface Stat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  hint: string;
}

const STATS: Stat[] = [
  { value: 42, suffix: 'ms', label: 'Median latency', hint: 'p50 round-trip on a global LiveKit cluster' },
  { value: 99.95, suffix: '%', label: 'Uptime', hint: 'Last 90 days across all regions' },
  { value: 100, label: 'Participants', hint: 'Per room on the free tier' },
  { value: 0, label: 'Downloads', hint: 'It’s just a browser tab' },
];

function AnimatedNumber({ to, prefix, suffix }: { to: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (! inView) {
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(to * eased);
      if (k < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setValue(to);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [inView, to]);

  const display = Number.isInteger(to)
    ? Math.floor(value).toString()
    : value.toFixed(2);

  return (
    <span ref={ref} className="font-semibold">
      {prefix ?? ''}
      {display}
      {suffix ?? ''}
    </span>
  );
}

export function Stats() {
  return (
    <section id="why" className="border-b border-border/40 py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            Why open-meet
          </span>
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the way your team actually works.
          </h2>
        </header>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex flex-col items-start gap-2 bg-card/60 p-6 backdrop-blur"
            >
              <span className="text-4xl tracking-tight sm:text-5xl">
                <AnimatedNumber to={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </span>
              <span className="text-sm font-medium text-foreground">{stat.label}</span>
              <span className="text-xs text-muted-foreground">{stat.hint}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
