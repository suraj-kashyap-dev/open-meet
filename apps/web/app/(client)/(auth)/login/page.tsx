import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { LoginForm } from '@/features/web/auth/components/login-form';
import { REDIRECT_PARAM, resolveRedirect } from '@/features/web/auth/lib/redirect';
import { Logo } from '@open-meet/ui/logo';

export const metadata: Metadata = {
  title: 'Sign in · Open Meet',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [REDIRECT_PARAM]?: string }>;
}) {
  const target = resolveRedirect((await searchParams)[REDIRECT_PARAM]);
  const registerHref =
    target === '/' ? '/register' : `/register?${REDIRECT_PARAM}=${encodeURIComponent(target)}`;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Logo className="h-7 w-7" />
        <span>Open Meet</span>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back. Sign in to start or join a meeting.
          </p>
        </header>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href={registerHref} className="underline hover:text-foreground">
          Create one
        </Link>
      </p>
    </div>
  );
}
