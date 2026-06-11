'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserDto } from '@open-meet/types';

import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';
import { useUpdateProfile } from '@/features/web/auth/hooks/use-auth';
import { usePathname, useRouter } from '@/i18n/navigation';
import { type Locale, routing } from '@/i18n/routing';
import { ApiClientError } from '@/lib/api/client';

import { FormActions } from './form-actions';

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

const LANGUAGES: { value: string; label: string }[] = routing.locales.map((value) => ({
  value,
  label: LANGUAGE_NAMES[value],
}));

const TIMEZONES: string[] = [
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

const schema = z.object({
  timezone: z.string().min(1).max(64),
  language: z.string().min(1).max(8),
});

type Values = z.infer<typeof schema>;

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function LocalizationSettings({ user }: { user: UserDto }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const updateProfile = useUpdateProfile();

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: user.timezone, language: user.language },
  });

  useEffect(() => {
    reset({ timezone: user.timezone, language: user.language });
  }, [user, reset]);

  const timezone = watch('timezone');
  const language = watch('language');
  const pending = isSubmitting || updateProfile.isPending;

  const tzOptions = useMemo(() => {
    const list = [...TIMEZONES];

    if (timezone && !list.includes(timezone)) {
      list.unshift(timezone);
    }

    return list;
  }, [timezone]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync(values);

      toast.success(t('toast.localization-updated'));

      if (values.language !== locale) {
        router.replace(pathname, { locale: values.language as Locale });
      }
    } catch (err) {
      toast.error(messageFromError(err, t('toast.localization-update-failed')));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('settings.timezone')}</Label>

          <Select
            value={timezone}
            onValueChange={(v) => setValue('timezone', v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.timezone-placeholder')} />
            </SelectTrigger>

            <SelectContent>
              {tzOptions.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{t('settings.language')}</Label>

          <Select
            value={language}
            onValueChange={(v) => setValue('language', v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('settings.language-placeholder')} />
            </SelectTrigger>

            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FormActions
        pending={pending}
        dirty={isDirty}
        onReset={() => reset({ timezone: user.timezone, language: user.language })}
      />
    </form>
  );
}
