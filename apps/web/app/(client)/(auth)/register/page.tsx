import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/features/auth/components/register-form';
import { Logo } from '@/components/shared/logo';

export const metadata: Metadata = {
  title: 'Create account · open-meet',
};

export default function RegisterPage() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col items-center gap-4 text-center">
        <Link href="/" aria-label="Open Meet — back to home">
          <Logo className="h-10 w-10" />
        </Link>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create your account</h1>
          <p className="text-sm text-muted-foreground">Set up open-meet in a few seconds</p>
        </div>
      </div>

      <RegisterForm />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
