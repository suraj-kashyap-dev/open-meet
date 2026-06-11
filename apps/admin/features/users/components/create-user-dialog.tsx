'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { AdminCreateUserDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';
import { Switch } from '@open-meet/ui/switch';
import { Textarea } from '@open-meet/ui/textarea';

import { useCreateAdminUser } from '@/features/users/hooks/use-admin-users';
import { type Locale, routing } from '@/i18n/routing';
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

const LANGUAGES = routing.locales.map((value) => ({ value, label: LANGUAGE_NAMES[value] }));

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
  name: string;
  email: string;
  password: string;
  timezone: string;
  language: string;
  bio: string;
  canCreateGroups: boolean;
}

const DEFAULTS: FormValues = {
  name: '',
  email: '',
  password: '',
  timezone: 'UTC',
  language: 'en',
  bio: '',
  canCreateGroups: true,
};

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('users.create-dialog');
  const tEdit = useTranslations('users.edit-dialog');
  const create = useCreateAdminUser();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('validation.name-required')).max(100),
        email: z.string().email(t('validation.invalid-email')).max(254),
        password: z
          .string()
          .min(8, t('validation.password-too-short'))
          .max(128, t('validation.password-too-long')),
        timezone: z.string().min(1).max(64),
        language: z.string().min(1).max(8),
        bio: z.string().trim().max(500, tEdit('validation.bio-too-long')),
        canCreateGroups: z.boolean(),
      }),
    [t, tEdit],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (!open) {
      reset(DEFAULTS);
    }
  }, [open, reset]);

  const timezone = watch('timezone');
  const language = watch('language');
  const canCreateGroups = watch('canCreateGroups');

  const onSubmit = handleSubmit(async (values) => {
    const body: AdminCreateUserDto = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      timezone: values.timezone,
      language: values.language,
      bio: values.bio.trim() || null,
      canCreateGroups: values.canCreateGroups,
    };

    try {
      await create.mutateAsync(body);

      toast.success(t('success', { email: body.email }));

      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('error'));
    }
  });

  const pending = isSubmitting || create.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-user-name">{t('name')}</Label>
              <Input id="create-user-name" autoComplete="off" autoFocus {...register('name')} />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-user-email">{t('email')}</Label>
              <Input
                id="create-user-email"
                type="email"
                autoComplete="off"
                placeholder="person@company.com"
                {...register('email')}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>{tEdit('timezone')}</Label>
              <Select value={timezone} onValueChange={(v) => setValue('timezone', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={tEdit('timezone-placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{tEdit('language')}</Label>
              <Select value={language} onValueChange={(v) => setValue('language', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={tEdit('language-placeholder')} />
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

          <div className="space-y-2">
            <Label htmlFor="create-user-password">{t('password')}</Label>
            <Input
              id="create-user-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('password-helper')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-user-bio">{tEdit('bio')}</Label>
            <Textarea
              id="create-user-bio"
              rows={3}
              placeholder={tEdit('bio-placeholder')}
              {...register('bio')}
            />
            {errors.bio ? <p className="text-xs text-destructive">{errors.bio.message}</p> : null}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="create-user-can-create-groups" className="cursor-pointer font-medium">
                {tEdit('can-create-groups')}
              </Label>
              <p className="text-xs text-muted-foreground">{tEdit('can-create-groups-hint')}</p>
            </div>
            <Switch
              id="create-user-can-create-groups"
              checked={canCreateGroups}
              onCheckedChange={(v) => setValue('canCreateGroups', v)}
              className="mt-0.5"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {pending ? t('submitting') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
