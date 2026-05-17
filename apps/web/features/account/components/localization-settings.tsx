'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserDto } from '@open-meet/types';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateProfile } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';

import { FormActions } from './form-actions';

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ja', label: '日本語' },
  { value: 'pt', label: 'Português' },
  { value: 'zh', label: '中文' },
];

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
      toast.success('Localization updated');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to update localization'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Timezone</Label>

          <Select
            value={timezone}
            onValueChange={(v) => setValue('timezone', v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a timezone" />
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
          <Label>Language</Label>

          <Select
            value={language}
            onValueChange={(v) => setValue('language', v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a language" />
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
