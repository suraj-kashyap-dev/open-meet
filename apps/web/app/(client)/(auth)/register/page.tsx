import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/features/web/auth/components/register-form';
import { Logo } from '@open-meet/ui/logo';

export const metadata: Metadata = {
  title: 'Create account · Open Meet',
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Logo className="h-7 w-7" />
        <span>Open Meet</span>
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">Set up Open Meet in a few seconds.</p>
        </header>

        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="underline hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}
