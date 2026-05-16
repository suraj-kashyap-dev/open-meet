import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components/client/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign in · open-meet',
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to start or join a meeting</p>
      </header>
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
