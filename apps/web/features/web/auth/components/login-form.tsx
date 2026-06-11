'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { AuthDivider } from '@/features/web/auth/components/auth-divider';
import { GoogleSignInButton } from '@/features/web/auth/components/google-sign-in-button';
import { useGoogleAuthEnabled, useLogin } from '@/features/web/auth/hooks/use-auth';
import { REDIRECT_PARAM, resolveRedirect } from '@/features/web/auth/lib/redirect';
import { ApiClientError } from '@/lib/api/client';

interface FormValues {
  email: string;
  password: string;
}

export function LoginForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const login = useLogin(resolveRedirect(searchParams.get(REDIRECT_PARAM)));
  const { data: googleEnabled } = useGoogleAuthEnabled();
  const oauthErrorShown = useRef(false);

  useEffect(() => {
    const error = searchParams.get('error');

    if (!error || oauthErrorShown.current) {
      return;
    }

    oauthErrorShown.current = true;

    const key = `oauth.${error}` as const;
    const message = t.has(key) ? t(key) : t('oauth.fallback');

    toast.error(message);
  }, [searchParams, t]);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('validation.invalid-email')),
        password: z.string().min(1, t('validation.password-required')),
      }),
    [t],
  );

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
      const message = err instanceof ApiClientError ? err.message : t('validation.generic');

      toast.error(message);
    }
  });

  const pending = isSubmitting || login.isPending;

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('login.email')}</Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('login.email-placeholder')}
            {...register('email')}
          />

          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">{t('login.password')}</Label>

          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder={t('login.password')}
            {...register('password')}
          />

          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}

          {pending ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <AuthDivider />

          <GoogleSignInButton label={t('login.google')} />
        </>
      ) : null}
    </div>
  );
}
