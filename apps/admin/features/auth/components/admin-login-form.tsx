'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { useAdminLogin } from '@/features/auth/hooks/use-admin-auth';
import { ApiClientError } from '@/lib/api/client';

interface FormValues {
  email: string;
  password: string;
}

export function AdminLoginForm() {
  const t = useTranslations('auth');
  const login = useAdminLogin();

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
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t('login.email')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
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
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" variant="accent" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {pending ? t('login.submitting') : t('login.submit')}
      </Button>
    </form>
  );
}
