'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Crown, Loader2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { adminAccountsApi } from '@/features/accounts/services/accounts';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

type FormValues = {
  password: string;
  confirm: string;
};

export function AcceptInviteForm() {
  const t = useTranslations('accept-invite');
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const lookup = useQuery({
    queryKey: ['admin-invite-lookup', token],
    queryFn: ({ signal }) => adminAccountsApi.lookupInvite(token, signal),
    enabled: token.length > 0,
    retry: false,
    staleTime: Infinity,
  });

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t('validation.password-min')).max(200),
          confirm: z.string(),
        })
        .refine((v) => v.password === v.confirm, {
          message: t('validation.password-mismatch'),
          path: ['confirm'],
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
      await adminAccountsApi.acceptInvite({ token, password: values.password });
      toast.success(t('toast.activated'));
      router.replace('/login');
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('errors.activate-failed');
      toast.error(message);
    }
  });

  if (!token) {
    return <InviteError message={t('errors.missing-token')} />;
  }

  if (lookup.isLoading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (lookup.isError || !lookup.data) {
    const message =
      lookup.error instanceof ApiClientError ? lookup.error.message : t('errors.invalid');
    return <InviteError message={message} />;
  }

  const invite = lookup.data;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <p className="text-muted-foreground">{t('joining-as')}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-medium">{invite.email}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {invite.role === 'SUPERADMIN' ? <Crown className="h-3 w-3" /> : null}
            {invite.role === 'SUPERADMIN' ? t('roles.superadmin') : t('roles.admin')}
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t('password-placeholder')}
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t('confirm')}</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            {...register('confirm')}
          />
          {errors.confirm ? (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          ) : null}
        </div>

        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </div>
  );
}

function InviteError({ message }: { message: string }) {
  const t = useTranslations('accept-invite');

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-destructive">{message}</p>
      <Link href="/login" className="text-sm underline hover:text-foreground">
        {t('go-to-sign-in')}
      </Link>
    </div>
  );
}
