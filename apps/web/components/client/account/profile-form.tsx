'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AtSign,
  Bell,
  Check,
  Eye,
  Globe,
  Loader2,
  Lock,
  Mail,
  Mic,
  ShieldCheck,
  UserRound,
  Video,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserDto } from '@open-meet/types';
import {
  DEFAULT_MEETING_PREFERENCES,
  DEFAULT_PRIVACY_SETTINGS,
  MeetingDefaultView,
  ProfileVisibility,
} from '@open-meet/types';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  useChangePassword,
  useCurrentUser,
  useUpdateProfile,
} from '@/hooks/client/use-auth';
import { ApiClientError } from '@/lib/shared/api';
import { cn } from '@/lib/shared/cn';

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

function formatJoined(iso: string | null | undefined): string {
  if (! iso) {
    return '—';
  }

  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function ProfileForm() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading || ! user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">

      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Account
        </p>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>

        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage how you appear to others, your defaults for meetings, and what
          we share.
        </p>
      </header>

      <ProfileHero user={user} />

      <PersonalDetailsSection user={user} />

      <LocalizationSection user={user} />

      <SecuritySection />

      <MeetingPreferencesSection user={user} />

      <PrivacySection user={user} />

    </div>
  );
}

function ProfileHero({ user }: { user: UserDto }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative h-28 bg-gradient-to-br from-accent/30 via-accent/10 to-transparent sm:h-32">
        <div className="absolute inset-x-0 -bottom-12 flex justify-center sm:left-7 sm:justify-start">
          <Avatar className="h-24 w-24 ring-4 ring-card">
            {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}

            <AvatarFallback className="bg-accent/15 text-2xl font-semibold text-accent">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="px-6 pb-6 pt-16 sm:px-8 sm:pt-14">
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-semibold tracking-tight">{user.name}</h2>

            <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          </div>

          <p className="truncate text-sm text-muted-foreground">{user.email}</p>

          {user.bio ? (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/80">
              {user.bio}
            </p>
          ) : null}
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Member since" value={formatJoined(user.createdAt)} />

          <Stat label="Timezone" value={user.timezone} mono />

          <Stat label="Language" value={user.language.toUpperCase()} mono />
        </dl>
      </div>
    </section>
  );
}

const personalSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  avatar: z
    .string()
    .trim()
    .max(2048, 'Avatar URL is too long')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .trim()
    .max(500, 'Bio is too long')
    .optional()
    .or(z.literal('')),
});

type PersonalValues = z.infer<typeof personalSchema>;

function PersonalDetailsSection({ user }: { user: UserDto }) {
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      name: user.name,
      avatar: user.avatar ?? '',
      bio: user.bio ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: user.name,
      avatar: user.avatar ?? '',
      bio: user.bio ?? '',
    });
  }, [user, reset]);

  const bioValue = watch('bio') ?? '';
  const pending = isSubmitting || updateProfile.isPending;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({
        name: values.name,
        avatar: values.avatar?.trim() || null,
        bio: values.bio?.trim() || null,
      });

      toast.success('Profile updated');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to update profile'));
    }
  });

  return (
    <Section
      title="Personal details"
      description="Updates apply across every meeting and chat."
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 px-6 py-6 sm:px-8"
        noValidate
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id="name"
            label="Display name"
            hint="Visible to everyone in your meetings."
            error={errors.name?.message}
          >
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              aria-invalid={Boolean(errors.name)}
              className="h-11 pl-9"
              {...register('name')}
            />
          </Field>

          <Field
            id="email"
            label="Email"
            hint="Used for sign-in. Email changes aren't available yet."
          >
            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="email"
              type="email"
              value={user.email}
              readOnly
              disabled
              className="h-11 cursor-not-allowed pl-9"
            />
          </Field>
        </div>

        <Field
          id="avatar"
          label="Avatar URL"
          hint="Paste a square image URL. Leave empty to use your initials."
          error={errors.avatar?.message}
        >
          <Input
            id="avatar"
            type="url"
            placeholder="https://example.com/me.png"
            autoComplete="off"
            aria-invalid={Boolean(errors.avatar)}
            className="h-11"
            {...register('avatar')}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="bio">Bio</Label>

            <span className="text-[11px] tabular-nums text-muted-foreground">
              {bioValue.length}/500
            </span>
          </div>

          <Textarea
            id="bio"
            rows={4}
            placeholder="A short note about you, shown on your profile."
            aria-invalid={Boolean(errors.bio)}
            {...register('bio')}
          />

          {errors.bio ? (
            <p className="text-xs text-destructive">{errors.bio.message}</p>
          ) : null}
        </div>

        <FormActions
          pending={pending}
          dirty={isDirty}
          onReset={() =>
            reset({
              name: user.name,
              avatar: user.avatar ?? '',
              bio: user.bio ?? '',
            })
          }
        />
      </form>
    </Section>
  );
}

const localizationSchema = z.object({
  timezone: z.string().min(1).max(64),
  language: z.string().min(1).max(8),
});

type LocalizationValues = z.infer<typeof localizationSchema>;

function LocalizationSection({ user }: { user: UserDto }) {
  const updateProfile = useUpdateProfile();

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<LocalizationValues>({
    resolver: zodResolver(localizationSchema),
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

    if (timezone && ! list.includes(timezone)) {
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
    <Section
      icon={<Globe className="h-4 w-4" />}
      title="Localization"
      description="Used for meeting times, dates, and the UI language."
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 px-6 py-6 sm:px-8"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Timezone</Label>

            <Select
              value={timezone}
              onValueChange={(v) =>
                setValue('timezone', v, { shouldDirty: true })
              }
            >
              <SelectTrigger className="h-11">
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

          <div className="space-y-2">
            <Label>Language</Label>

            <Select
              value={language}
              onValueChange={(v) =>
                setValue('language', v, { shouldDirty: true })
              }
            >
              <SelectTrigger className="h-11">
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
          onReset={() =>
            reset({ timezone: user.timezone, language: user.language })
          }
        />
      </form>
    </Section>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .max(128, 'Too long'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'New password must differ from the current one',
  });

type PasswordValues = z.infer<typeof passwordSchema>;

function SecuritySection() {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
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
      toast.success('Password changed — sign in again');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to change password'));
    }
  });

  return (
    <Section
      icon={<Lock className="h-4 w-4" />}
      title="Password"
      description="Changing your password signs you out everywhere."
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 px-6 py-6 sm:px-8"
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            id="currentPassword"
            label="Current password"
            error={errors.currentPassword?.message}
          >
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className="h-11"
              {...register('currentPassword')}
            />
          </Field>

          <Field
            id="newPassword"
            label="New password"
            error={errors.newPassword?.message}
          >
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="h-11"
              {...register('newPassword')}
            />
          </Field>

          <Field
            id="confirmPassword"
            label="Confirm new password"
            error={errors.confirmPassword?.message}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="h-11"
              {...register('confirmPassword')}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
          <Button
            type="button"
            variant="ghost"
            disabled={! isDirty || pending}
            onClick={() =>
              reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
            }
          >
            Clear
          </Button>

          <Button type="submit" disabled={! isDirty || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? 'Changing…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Section>
  );
}

const meetingPrefsSchema = z.object({
  defaultMicMuted: z.boolean(),
  defaultCameraOff: z.boolean(),
  defaultView: z.enum([MeetingDefaultView.GALLERY, MeetingDefaultView.SPEAKER]),
  enableJoinSound: z.boolean(),
  enableNotifications: z.boolean(),
});

type MeetingPrefsValues = z.infer<typeof meetingPrefsSchema>;

function MeetingPreferencesSection({ user }: { user: UserDto }) {
  const updateProfile = useUpdateProfile();

  const defaults: MeetingPrefsValues = {
    ...DEFAULT_MEETING_PREFERENCES,
    ...user.meetingPreferences,
  };

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<MeetingPrefsValues>({
    resolver: zodResolver(meetingPrefsSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset({ ...DEFAULT_MEETING_PREFERENCES, ...user.meetingPreferences });
  }, [user, reset]);

  const values = watch();
  const pending = isSubmitting || updateProfile.isPending;

  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateProfile.mutateAsync({ meetingPreferences: v });
      toast.success('Meeting preferences updated');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to update preferences'));
    }
  });

  return (
    <Section
      icon={<Video className="h-4 w-4" />}
      title="Meeting preferences"
      description="Defaults applied when you join or start a meeting."
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 px-6 py-6 sm:px-8"
        noValidate
      >

        <ToggleRow
          icon={<Mic className="h-4 w-4" />}
          title="Join muted by default"
          description="Start with your microphone off so you don't broadcast accidentally."
          checked={values.defaultMicMuted}
          onCheckedChange={(c) =>
            setValue('defaultMicMuted', c, { shouldDirty: true })
          }
        />

        <ToggleRow
          icon={<Video className="h-4 w-4" />}
          title="Camera off by default"
          description="Keep your camera off until you explicitly turn it on."
          checked={values.defaultCameraOff}
          onCheckedChange={(c) =>
            setValue('defaultCameraOff', c, { shouldDirty: true })
          }
        />

        <div className="space-y-2">
          <Label>Default view</Label>

          <Select
            value={values.defaultView}
            onValueChange={(v) =>
              setValue('defaultView', v as MeetingDefaultView, {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={MeetingDefaultView.GALLERY}>Gallery</SelectItem>

              <SelectItem value={MeetingDefaultView.SPEAKER}>Speaker</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ToggleRow
          icon={<Bell className="h-4 w-4" />}
          title="Play sound when others join"
          description="Hear a soft chime when a participant enters the room."
          checked={values.enableJoinSound}
          onCheckedChange={(c) =>
            setValue('enableJoinSound', c, { shouldDirty: true })
          }
        />

        <ToggleRow
          icon={<Bell className="h-4 w-4" />}
          title="Browser notifications"
          description="Get notified about reactions, chat, and meeting invites."
          checked={values.enableNotifications}
          onCheckedChange={(c) =>
            setValue('enableNotifications', c, { shouldDirty: true })
          }
        />

        <FormActions
          pending={pending}
          dirty={isDirty}
          onReset={() =>
            reset({ ...DEFAULT_MEETING_PREFERENCES, ...user.meetingPreferences })
          }
        />

      </form>
    </Section>
  );
}

const privacySchema = z.object({
  showEmailToParticipants: z.boolean(),
  allowDirectMessages: z.boolean(),
  profileVisibility: z.enum([
    ProfileVisibility.PUBLIC,
    ProfileVisibility.PARTICIPANTS_ONLY,
    ProfileVisibility.PRIVATE,
  ]),
  shareUsageData: z.boolean(),
});

type PrivacyValues = z.infer<typeof privacySchema>;

function PrivacySection({ user }: { user: UserDto }) {
  const updateProfile = useUpdateProfile();

  const defaults: PrivacyValues = {
    ...DEFAULT_PRIVACY_SETTINGS,
    ...user.privacySettings,
  };

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty },
  } = useForm<PrivacyValues>({
    resolver: zodResolver(privacySchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset({ ...DEFAULT_PRIVACY_SETTINGS, ...user.privacySettings });
  }, [user, reset]);

  const values = watch();
  const pending = isSubmitting || updateProfile.isPending;

  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateProfile.mutateAsync({ privacySettings: v });
      toast.success('Privacy settings updated');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to update privacy settings'));
    }
  });

  return (
    <Section
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Privacy"
      description="Control what others see and how your data is used."
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5 px-6 py-6 sm:px-8"
        noValidate
      >

        <div className="space-y-2">
          <Label>Profile visibility</Label>

          <Select
            value={values.profileVisibility}
            onValueChange={(v) =>
              setValue('profileVisibility', v as ProfileVisibility, {
                shouldDirty: true,
              })
            }
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value={ProfileVisibility.PUBLIC}>
                Public — anyone with the link
              </SelectItem>

              <SelectItem value={ProfileVisibility.PARTICIPANTS_ONLY}>
                Participants only — people you've met with
              </SelectItem>

              <SelectItem value={ProfileVisibility.PRIVATE}>
                Private — only you
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ToggleRow
          icon={<Mail className="h-4 w-4" />}
          title="Show email to participants"
          description="Let people in your meetings see your email address."
          checked={values.showEmailToParticipants}
          onCheckedChange={(c) =>
            setValue('showEmailToParticipants', c, { shouldDirty: true })
          }
        />

        <ToggleRow
          icon={<Eye className="h-4 w-4" />}
          title="Allow direct messages"
          description="Let others start a 1-1 chat with you outside of meetings."
          checked={values.allowDirectMessages}
          onCheckedChange={(c) =>
            setValue('allowDirectMessages', c, { shouldDirty: true })
          }
        />

        <ToggleRow
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Share anonymous usage data"
          description="Helps us improve Open Meet. No meeting content is ever shared."
          checked={values.shareUsageData}
          onCheckedChange={(c) =>
            setValue('shareUsageData', c, { shouldDirty: true })
          }
        />

        <FormActions
          pending={pending}
          dirty={isDirty}
          onReset={() =>
            reset({ ...DEFAULT_PRIVACY_SETTINGS, ...user.privacySettings })
          }
        />

      </form>
    </Section>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>

      <dd className={cn('mt-1 truncate text-sm font-medium', mono ? 'font-mono' : '')}>
        {value}
      </dd>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border px-6 py-5 sm:px-8">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/20">
            {icon}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>

          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>

      <div className="relative">{children}</div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/30 p-4 transition-colors hover:border-border">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>

        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>

      <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-1" />
    </label>
  );
}

function FormActions({
  pending,
  dirty,
  onReset,
}: {
  pending: boolean;
  dirty: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
      <Button
        type="button"
        variant="ghost"
        disabled={! dirty || pending}
        onClick={onReset}
      >
        Reset
      </Button>

      <Button type="submit" disabled={! dirty || pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Save changes
          </>
        )}
      </Button>
    </div>
  );
}
