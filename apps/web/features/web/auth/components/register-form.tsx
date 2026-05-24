'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { AuthDivider } from '@/features/web/auth/components/auth-divider';
import { GoogleSignInButton } from '@/features/web/auth/components/google-sign-in-button';
import { useGoogleAuthEnabled, useRegister } from '@/features/web/auth/hooks/use-auth';
import { REDIRECT_PARAM, resolveRedirect } from '@/features/web/auth/lib/redirect';
import { ApiClientError } from '@/lib/api/client';

interface FormValues {
  name: string;
  email: string;
  password: string;
}

export function RegisterForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const register = useRegister(resolveRedirect(searchParams.get(REDIRECT_PARAM)));
  const { data: googleEnabled } = useGoogleAuthEnabled();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('validation.name-required')).max(120),
        email: z.string().email(t('validation.invalid-email')),
        password: z.string().min(8, t('validation.password-min')),
      }),
    [t],
  );

  const {
    register: r,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('validation.generic');

      toast.error(message);
    }
  });

  const pending = isSubmitting || register.isPending;

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('register.name')}</Label>

          <Input
            id="name"
            autoComplete="name"
            placeholder={t('register.name-placeholder')}
            {...r('name')}
          />

          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">{t('register.email')}</Label>

          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('register.email-placeholder')}
            {...r('email')}
          />

          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">{t('register.password')}</Label>

          <Input
            id="password"
            type="password"
            placeholder={t('register.password')}
            autoComplete="new-password"
            {...r('password')}
          />

          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('register.password-hint')}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}

          {pending ? t('register.submitting') : t('register.submit')}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <AuthDivider />

          <GoogleSignInButton label={t('register.google')} />
        </>
      ) : null}
    </div>
  );
}
