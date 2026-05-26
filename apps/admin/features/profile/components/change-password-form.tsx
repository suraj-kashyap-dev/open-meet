'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { useChangeAdminPassword } from '@/features/auth/hooks/use-admin-auth';
import { ApiClientError } from '@/lib/api/client';

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordForm() {
  const t = useTranslations('profile');
  const change = useChangeAdminPassword();

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('password.validation.current-required')),
          newPassword: z.string().min(8, t('password.validation.password-min')).max(200),
          confirmPassword: z.string(),
        })
        .refine((v) => v.newPassword === v.confirmPassword, {
          message: t('password.validation.password-mismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
      toast.success(t('password.success'));
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('password.error');
      toast.error(message);
    }
  });

  const pending = isSubmitting || change.isPending;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight">{t('password.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('password.description')}</p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="current-password">{t('password.current')}</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            placeholder={t('password.current-placeholder')}
            {...register('currentPassword')}
          />
          {errors.currentPassword ? (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t('password.new')}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder={t('password.new-placeholder')}
              {...register('newPassword')}
            />
            {errors.newPassword ? (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('password.new-helper')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">{t('password.confirm')}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder={t('password.confirm-placeholder')}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? t('password.changing') : t('password.change')}
          </Button>
        </div>
      </form>
    </section>
  );
}
