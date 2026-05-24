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
import { useChangePassword } from '@/features/web/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function PasswordForm() {
  const t = useTranslations('account');
  const changePassword = useChangePassword();

  const schema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('validation.password-required')),
          newPassword: z
            .string()
            .min(8, t('validation.password-min'))
            .max(128, t('validation.password-too-long')),
          confirmPassword: z.string().min(1, t('validation.password-required')),
        })
        .refine((d) => d.newPassword === d.confirmPassword, {
          path: ['confirmPassword'],
          message: t('validation.password-mismatch'),
        })
        .refine((d) => d.newPassword !== d.currentPassword, {
          path: ['newPassword'],
          message: t('validation.password-same'),
        }),
    [t],
  );

  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const pending = isSubmitting || changePassword.isPending;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(t('toast.password-changed'));
    } catch (err) {
      toast.error(messageFromError(err, t('toast.password-change-failed')));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">{t('password.current')}</Label>

          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...register('currentPassword')}
          />

          {errors.currentPassword ? (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newPassword">{t('password.new')}</Label>

          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
          />

          {errors.newPassword ? (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">{t('password.confirm')}</Label>

          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />

          {errors.confirmPassword ? (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">{t('password.info')}</p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!isDirty || pending}
            onClick={() => reset({ currentPassword: '', newPassword: '', confirmPassword: '' })}
          >
            {t('password.clear')}
          </Button>

          <Button type="submit" size="sm" disabled={!isDirty || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? t('password.changing') : t('password.change')}
          </Button>
        </div>
      </div>
    </form>
  );
}
