'use client';

import { motion } from 'motion/react';
import { Link2, MousePointerClick, Users } from 'lucide-react';

const steps = [
  {
    n: '01',
    icon: <MousePointerClick className="h-5 w-5" />,
    title: 'One click to start',
    body:
      'Hit "New meeting" — you get a fresh, sharable URL in under a second. No setup, no calendars.',
  },
  {
    n: '02',
    icon: <Link2 className="h-5 w-5" />,
    title: 'Share a link',
    body:
      'Drop the code in Slack, Linear, an email — anywhere. Guests join straight from the browser.',
  },
  {
    n: '03',
    icon: <Users className="h-5 w-5" />,
    title: 'Talk like you mean it',
    body:
      `HD video, screen share, chat, reactions, raise-hand — everything you expect, nothing you don't.`,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-b border-border/40 py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            How it works
          </span>
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From signed-out to face-to-face in under a minute.
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
              className="relative flex flex-col gap-4 rounded-xl border border-border/60 bg-card/30 p-6"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{step.n}</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
                  {step.icon}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-medium tracking-tight">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
