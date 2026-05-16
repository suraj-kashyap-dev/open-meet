import Link from 'next/link';

import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Button } from '@/components/ui/button';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-border/40 py-24 sm:py-32">
      <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Stop scheduling meetings.{' '}
          <span className="gradient-text">Just have them.</span>
        </h2>
        <p className="max-w-xl text-balance text-muted-foreground">
          Spin up a room in one click, send the link, and get on with shipping.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <ShimmerButton asChild>
            <Link href="/register" className="px-8">
              Start free →
            </Link>
          </ShimmerButton>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
