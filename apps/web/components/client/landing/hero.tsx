'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Button } from '@/components/ui/button';
import { Spotlight } from '@/components/ui/spotlight';

import { ProductMockup } from './product-mockup';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <Spotlight />

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-5 text-center"
        >
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition-colors hover:border-accent/50 hover:text-foreground"
          >
            <Sparkles className="h-3 w-3 text-accent" />
            <span>New — Free for up to 100 participants</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Live video for teams that{' '}
            <span className="gradient-text">actually ship</span>.
          </h1>

          <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Open-source, end-to-end-encrypted video conferencing built for distributed
            engineering teams. No downloads. No friction. Just a link.
          </p>

          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <ShimmerButton asChild>
              <Link href="/register" className="px-7">
                Start free →
              </Link>
            </ShimmerButton>
            <Button asChild variant="outline" size="lg">
              <Link href="#how">See how it works</Link>
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground/70">
            No credit card required · Open source · Self-hostable
          </p>
        </motion.div>

        <div className="w-full max-w-5xl">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
