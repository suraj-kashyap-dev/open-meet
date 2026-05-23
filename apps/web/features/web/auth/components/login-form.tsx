'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthDivider } from '@/features/web/auth/components/auth-divider';
import { GoogleSignInButton } from '@/features/web/auth/components/google-sign-in-button';
import { useGoogleAuthEnabled, useLogin } from '@/features/web/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_denied: 'Google sign-in was cancelled.',
  state_mismatch: 'Sign-in session expired. Please try again.',
  missing_code: 'Google did not return an authorization code.',
  login_failed: 'Could not sign you in with Google. Please try again.',
};

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const login = useLogin();
  const { data: googleEnabled } = useGoogleAuthEnabled();
  const searchParams = useSearchParams();
  const oauthErrorShown = useRef(false);

  useEffect(() => {
    const error = searchParams.get('error');

    if (!error || oauthErrorShown.current) return;

    oauthErrorShown.current = true;

    toast.error(OAUTH_ERROR_MESSAGES[error] ?? 'Sign-in failed. Please try again.');
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong';

      toast.error(message);
    }
  });

  const pending = isSubmitting || login.isPending;

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />

          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>

          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            {...register('password')}
          />

          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}

          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <AuthDivider />

          <GoogleSignInButton label="Sign in with Google" />
        </>
      ) : null}
    </div>
  );
}
