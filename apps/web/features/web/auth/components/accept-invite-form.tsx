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

import { useAcceptInvite, useInviteLookup } from '@/features/web/auth/hooks/use-auth';
import { Link } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

interface FormValues {
  password: string;
  confirm: string;
}

export function AcceptInviteForm() {
  const t = useTranslations('auth');
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const lookup = useInviteLookup(token);
  const accept = useAcceptInvite('/');

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t('validation.password-min')),
          confirm: z.string(),
        })
        .refine((v) => v.password === v.confirm, {
          path: ['confirm'],
          message: t('accept-invite.password-mismatch'),
        }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await accept.mutateAsync({ token, password: values.password });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('validation.generic'));
    }
  });

  if (!token) {
    return <p className="text-sm text-destructive">{t('accept-invite.missing-token')}</p>;
  }

  if (lookup.isLoading) {
    return <p className="text-sm text-muted-foreground">{t('accept-invite.loading')}</p>;
  }

  if (lookup.isError || !lookup.data) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-destructive">{t('accept-invite.invalid')}</p>
        <Link href="/login" className="text-sm underline hover:text-foreground">
          {t('accept-invite.back-to-login')}
        </Link>
      </div>
    );
  }

  const pending = isSubmitting || accept.isPending;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t('accept-invite.joining-as', { email: lookup.data.email })}
      </p>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('accept-invite.password')}</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('register.password-hint')}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t('accept-invite.confirm')}</Label>
          <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
          {errors.confirm ? (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          {pending ? t('accept-invite.submitting') : t('accept-invite.submit')}
        </Button>
      </form>
    </div>
  );
}
