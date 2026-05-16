'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { AdminUpdateUserDto, AdminUserDto } from '@open-meet/types';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateAdminUser } from '@/hooks/admin/use-admin-users';
import { ApiClientError } from '@/lib/shared/api';

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
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().email('Enter a valid email').max(254),
  avatar: z
    .string()
    .trim()
    .max(2048, 'Avatar URL is too long')
    .optional()
    .or(z.literal('')),
  timezone: z.string().min(1).max(64),
  language: z.string().min(1).max(8),
  bio: z
    .string()
    .trim()
    .max(500, 'Bio is too long')
    .optional()
    .or(z.literal('')),
  newPassword: z
    .string()
    .max(128, 'Too long')
    .optional()
    .or(z.literal(''))
    .refine((v) => ! v || v.length >= 8, {
      message: 'At least 8 characters',
    }),
});

type FormValues = z.infer<typeof schema>;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function defaultsFor(user: AdminUserDto | null): FormValues {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    avatar: user?.avatar ?? '',
    timezone: user?.timezone ?? 'UTC',
    language: user?.language ?? 'en',
    bio: user?.bio ?? '',
    newPassword: '',
  };
}

interface Props {
  user: AdminUserDto | null;
  onClose: () => void;
}

export function EditUserDialog({ user, onClose }: Props) {
  const update = useUpdateAdminUser();
  const open = user !== null;

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
  }, [user, reset]);

  const timezone = watch('timezone');
  const language = watch('language');
  const avatar = watch('avatar');
  const name = watch('name');
  const bioValue = watch('bio') ?? '';

  const tzOptions = useMemo(() => {
    const list = [...TIMEZONES];

    if (timezone && ! list.includes(timezone)) {
      list.unshift(timezone);
    }

    return list;
  }, [timezone]);

  const onSubmit = handleSubmit(async (values) => {
    if (! user) {
      return;
    }

    const body: AdminUpdateUserDto = {};

    if (dirtyFields.name) {
      body.name = values.name;
    }

    if (dirtyFields.email) {
      body.email = values.email;
    }

    if (dirtyFields.avatar) {
      body.avatar = values.avatar?.trim() || null;
    }

    if (dirtyFields.timezone) {
      body.timezone = values.timezone;
    }

    if (dirtyFields.language) {
      body.language = values.language;
    }

    if (dirtyFields.bio) {
      body.bio = values.bio?.trim() || null;
    }

    if (dirtyFields.newPassword && values.newPassword) {
      body.newPassword = values.newPassword;
    }

    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }

    try {
      await update.mutateAsync({ id: user.id, body });
      toast.success('User updated');
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Could not update user';

      toast.error(message);
    }
  });

  const pending = isSubmitting || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => (! o ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update profile, localization, bio, or reset the password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto pr-1">

          <DialogSection title="Account">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                {avatar ? <AvatarImage src={avatar} alt={name || ''} /> : null}

                <AvatarFallback className="bg-accent/15 text-base font-semibold text-accent">
                  {initialsOf(name || user?.name || '')}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1.5">
                <Label htmlFor="avatar">Avatar URL</Label>

                <Input
                  id="avatar"
                  type="url"
                  placeholder="https://example.com/me.png"
                  autoComplete="off"
                  {...register('avatar')}
                />

                {errors.avatar ? (
                  <p className="text-xs text-destructive">{errors.avatar.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>

                <Input id="name" autoComplete="off" {...register('name')} />

                {errors.name ? (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>

                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  {...register('email')}
                />

                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
            </div>
          </DialogSection>

          <DialogSection title="Localization">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Timezone</Label>

                <Select
                  value={timezone}
                  onValueChange={(v) =>
                    setValue('timezone', v, { shouldDirty: true })
                  }
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
                  onValueChange={(v) =>
                    setValue('language', v, { shouldDirty: true })
                  }
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
          </DialogSection>

          <DialogSection title="About">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="bio">Bio</Label>

                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {bioValue.length}/500
                </span>
              </div>

              <Textarea
                id="bio"
                rows={3}
                placeholder="Optional"
                {...register('bio')}
              />

              {errors.bio ? (
                <p className="text-xs text-destructive">{errors.bio.message}</p>
              ) : null}
            </div>
          </DialogSection>

          <DialogSection title="Reset password">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>

              <Input
                id="newPassword"
                type="password"
                placeholder="Leave blank to keep the existing password"
                autoComplete="new-password"
                {...register('newPassword')}
              />

              {errors.newPassword ? (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Setting a new password invalidates the user's sessions.
                </p>
              )}
            </div>
          </DialogSection>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="accent"
            disabled={pending || ! isDirty}
            onClick={onSubmit}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>

      {children}
    </section>
  );
}
