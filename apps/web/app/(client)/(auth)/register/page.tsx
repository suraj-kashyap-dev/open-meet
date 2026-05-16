import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/components/client/auth/register-form';

export const metadata: Metadata = {
  title: 'Create account · open-meet',
};

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Set up open-meet in a few seconds</p>
      </header>
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
