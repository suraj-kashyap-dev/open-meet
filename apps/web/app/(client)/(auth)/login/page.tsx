import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/features/web/auth/components/login-form';
import { Logo } from '@/components/shared/logo';

export const metadata: Metadata = {
  title: 'Sign in · open-meet',
};

export default function LoginPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col items-center gap-4 text-center">
        <Link href="/" aria-label="Open Meet — back to home">
          <Logo className="h-10 w-10" />
        </Link>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to start or join a meeting</p>
        </div>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
