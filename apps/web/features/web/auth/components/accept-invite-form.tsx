'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@open-meet/ui/button';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';
import { Textarea } from '@open-meet/ui/textarea';

import { useAcceptInvite, useInviteLookup } from '@/features/web/auth/hooks/use-auth';
import { Link } from '@/i18n/navigation';
import { type Locale, locales } from '@/i18n/routing';
import { ApiClientError } from '@/lib/api/client';

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  es: 'Español',
  zh: '中文',
  ru: 'Русский',
  tr: 'Türkçe',
  hi: 'हिन्दी',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  bn: 'বাংলা',
};

const LANGUAGES = locales.map((value) => ({ value, label: LANGUAGE_NAMES[value] }));

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

interface FormValues {
  password: string;
  confirm: string;
  timezone: string;
  language: string;
  bio: string;
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
          timezone: z.string().min(1).max(64),
          language: z.string().min(1).max(8),
          bio: z.string().trim().max(500, t('accept-invite.bio-too-long')),
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '', timezone: 'UTC', language: 'en', bio: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await accept.mutateAsync({
        token,
        password: values.password,
        timezone: values.timezone,
        language: values.language,
        bio: values.bio.trim() || null,
      });
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
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('register.password-hint')}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t('accept-invite.confirm')}</Label>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('accept-invite.timezone')}</Label>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('accept-invite.timezone-placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('accept-invite.language')}</Label>
            <Controller
              control={control}
              name="language"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('accept-invite.language-placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">{t('accept-invite.bio')}</Label>
          <Textarea
            id="bio"
            rows={3}
            placeholder={t('accept-invite.bio-placeholder')}
            {...register('bio')}
          />
          {errors.bio ? <p className="text-xs text-destructive">{errors.bio.message}</p> : null}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {pending ? t('accept-invite.submitting') : t('accept-invite.submit')}
        </Button>
      </form>
    </div>
  );
}
