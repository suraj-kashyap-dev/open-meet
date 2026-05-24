'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { AdminUpdateUserDto, AdminUserDto } from '@open-meet/types';

import { UserAvatar } from '@open-meet/ui/user-avatar';
import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
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
import {
  useRemoveAdminUserAvatar,
  useUpdateAdminUser,
  useUploadAdminUserAvatar,
} from '@/features/users/hooks/use-admin-users';
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

const AVATAR_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MAX_MB = Math.round(AVATAR_MAX_BYTES / 1024 / 1024);

interface FormValues {
  name: string;
  email: string;
  timezone: string;
  language: string;
  bio: string;
  newPassword: string;
}

function defaultsFor(user: AdminUserDto | null): FormValues {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    timezone: user?.timezone ?? 'UTC',
    language: user?.language ?? 'en',
    bio: user?.bio ?? '',
    newPassword: '',
  };
}

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

interface Props {
  user: AdminUserDto | null;
  onClose: () => void;
}

export function EditUserDialog({ user, onClose }: Props) {
  const t = useTranslations('users.edit-dialog');
  const tAvatar = useTranslations('users.avatar');
  const update = useUpdateAdminUser();
  const uploadAvatar = useUploadAdminUserAvatar();
  const removeAvatar = useRemoveAdminUserAvatar();
  const open = user !== null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Avatar changes are staged locally and only persisted on "Save changes",
  // never on file pick.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t('validation.name-required')).max(100),
        email: z.string().email(t('validation.invalid-email')).max(254),
        timezone: z.string().min(1).max(64),
        language: z.string().min(1).max(8),
        bio: z.string().trim().max(500, t('validation.bio-too-long')),
        newPassword: z
          .string()
          .max(128, t('validation.password-too-long'))
          .refine((v) => v.length === 0 || v.length >= 8, {
            message: t('validation.password-too-short'),
          }),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(user),
  });

  useEffect(() => {
    reset(defaultsFor(user));
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(false);
  }, [user, reset]);

  // Revoke the staged preview's object URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const timezone = watch('timezone');
  const language = watch('language');
  const name = watch('name');
  const bioValue = watch('bio') ?? '';

  const tzOptions = useMemo(() => {
    const list = [...TIMEZONES];

    if (timezone && !list.includes(timezone)) {
      list.unshift(timezone);
    }

    return list;
  }, [timezone]);

  const displayedAvatar = avatarPreview ?? (avatarRemoved ? null : (user?.avatar ?? null));
  const avatarDirty = avatarFile !== null || avatarRemoved;

  const onPickFile = (): void => {
    fileInputRef.current?.click();
  };

  // Stage the picked file (validate + preview). Nothing is uploaded until save.
  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!AVATAR_MIMES.includes(file.type)) {
      toast.error(tAvatar('invalid-type'));
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(tAvatar('too-large', { mb: AVATAR_MAX_MB }));
      return;
    }

    setAvatarFile(file);
    setAvatarRemoved(false);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onStageRemove = (): void => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!user) {
      return;
    }

    const body: AdminUpdateUserDto = {};

    if (dirtyFields.name) {
      body.name = values.name;
    }

    if (dirtyFields.email) {
      body.email = values.email;
    }

    if (dirtyFields.timezone) {
      body.timezone = values.timezone;
    }

    if (dirtyFields.language) {
      body.language = values.language;
    }

    if (dirtyFields.bio) {
      body.bio = values.bio.trim() || null;
    }

    if (dirtyFields.newPassword && values.newPassword) {
      body.newPassword = values.newPassword;
    }

    const hasProfileChanges = Object.keys(body).length > 0;

    if (!hasProfileChanges && !avatarDirty) {
      onClose();
      return;
    }

    try {
      if (hasProfileChanges) {
        await update.mutateAsync({ id: user.id, body });
      }

      if (avatarFile) {
        await uploadAvatar.mutateAsync({ id: user.id, file: avatarFile });
      } else if (avatarRemoved) {
        await removeAvatar.mutateAsync(user.id);
      }

      toast.success(t('success'));
      onClose();
    } catch (err) {
      toast.error(messageFromError(err, t('error')));
    }
  });

  const pending =
    isSubmitting || update.isPending || uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <DialogSection title={t('section-account')}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_MIMES.join(',')}
                className="hidden"
                onChange={onFileChange}
              />

              <div className="relative shrink-0">
                <UserAvatar
                  user={{ name: name || user?.name || '', avatar: displayedAvatar }}
                  size="3xl"
                  className="ring-2 ring-border"
                />

                {displayedAvatar ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={tAvatar('edit-label')}
                      disabled={pending}
                      className={cn(
                        'absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full',
                        'border border-border bg-background text-foreground shadow-sm',
                        'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        'disabled:pointer-events-none disabled:opacity-60',
                      )}
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5" />
                      )}
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" sideOffset={6} className="w-48">
                      <DropdownMenuItem onSelect={onPickFile}>
                        <Camera className="h-4 w-4" />
                        {tAvatar('replace')}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onSelect={onStageRemove}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        {tAvatar('remove')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    type="button"
                    onClick={onPickFile}
                    disabled={pending}
                    aria-label={tAvatar('upload-label')}
                    className={cn(
                      'absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full',
                      'border border-border bg-background text-foreground shadow-sm',
                      'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      'disabled:pointer-events-none disabled:opacity-60',
                    )}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {tAvatar('helper', { mb: AVATAR_MAX_MB })}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t('name')}</Label>

                <Input id="name" autoComplete="off" {...register('name')} />

                {errors.name ? (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">{t('email')}</Label>

                <Input id="email" type="email" autoComplete="off" {...register('email')} />

                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
            </div>
          </DialogSection>

          <DialogSection title={t('section-localization')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('timezone')}</Label>

                <Select
                  value={timezone}
                  onValueChange={(v) => setValue('timezone', v, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('timezone-placeholder')} />
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
                <Label>{t('language')}</Label>

                <Select
                  value={language}
                  onValueChange={(v) => setValue('language', v, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('language-placeholder')} />
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
          </DialogSection>

          <DialogSection title={t('section-about')}>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="bio">{t('bio')}</Label>

                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {t('bio-counter', { count: bioValue.length })}
                </span>
              </div>

              <Textarea id="bio" rows={3} placeholder={t('bio-placeholder')} {...register('bio')} />

              {errors.bio ? <p className="text-xs text-destructive">{errors.bio.message}</p> : null}
            </div>
          </DialogSection>

          <DialogSection title={t('section-password')}>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">{t('new-password')}</Label>

              <Input
                id="newPassword"
                type="password"
                placeholder={t('new-password-placeholder')}
                autoComplete="new-password"
                {...register('newPassword')}
              />

              {errors.newPassword ? (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{t('new-password-helper')}</p>
              )}
            </div>
          </DialogSection>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t('cancel')}
          </Button>

          <Button
            type="button"
            variant="accent"
            disabled={pending || (!isDirty && !avatarDirty)}
            onClick={onSubmit}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>

      {children}
    </section>
  );
}
