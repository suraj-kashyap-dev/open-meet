import Link from 'next/link';
import { Video } from 'lucide-react';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <div className="absolute left-6 top-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <Video className="h-4 w-4" aria-hidden />
          </span>
          open-meet
        </Link>
      </div>

      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md rounded-xl border border-border/70 bg-card/70 p-8 shadow-xl backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
