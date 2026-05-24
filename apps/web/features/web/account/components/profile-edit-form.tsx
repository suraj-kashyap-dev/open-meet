'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserDto } from '@open-meet/types';

import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { Textarea } from '@open-meet/ui/textarea';
import { useUpdateProfile } from '@/features/web/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';

import { FormActions } from './form-actions';

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function ProfileEditForm({ user }: { user: UserDto }) {
  const t = useTranslations('account');
  const updateProfile = useUpdateProfile();

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t('validation.name-required'))
          .max(100, t('validation.name-too-long')),
        bio: z
          .string()
          .trim()
          .max(500, t('validation.bio-too-long'))
          .optional()
          .or(z.literal('')),
      }),
    [t],
  );

  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name,
      bio: user.bio ?? '',
    },
  });

  useEffect(() => {
    reset({ name: user.name, bio: user.bio ?? '' });
  }, [user, reset]);

  const bioValue = watch('bio') ?? '';
  const pending = isSubmitting || updateProfile.isPending;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({
        name: values.name,
        bio: values.bio?.trim() || null,
      });

      toast.success(t('toast.profile-updated'));
    } catch (err) {
      toast.error(messageFromError(err, t('toast.profile-update-failed')));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('profile.display-name')}</Label>

          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder={t('profile.display-name-placeholder')}
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />

          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('profile.display-name-hint')}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">{t('profile.email')}</Label>

          <Input
            id="email"
            type="email"
            value={user.email}
            readOnly
            disabled
            className="cursor-not-allowed"
          />

          <p className="text-xs text-muted-foreground">{t('profile.email-hint')}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="bio">{t('profile.bio')}</Label>

          <span className="text-[11px] tabular-nums text-muted-foreground">
            {t('profile.bio-counter', { count: bioValue.length })}
          </span>
        </div>

        <Textarea
          id="bio"
          rows={3}
          placeholder={t('profile.bio-placeholder')}
          aria-invalid={Boolean(errors.bio)}
          {...register('bio')}
        />

        {errors.bio ? <p className="text-xs text-destructive">{errors.bio.message}</p> : null}
      </div>

      <FormActions
        pending={pending}
        dirty={isDirty}
        onReset={() => reset({ name: user.name, bio: user.bio ?? '' })}
      />
    </form>
  );
}
