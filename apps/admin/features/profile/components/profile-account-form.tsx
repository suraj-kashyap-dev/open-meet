'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Crown, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { AdminDto } from '@open-meet/types';

import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { UserAvatar } from '@open-meet/ui/user-avatar';
import {
  useRemoveAdminAvatar,
  useUpdateAdminProfile,
  useUploadAdminAvatar,
} from '@/features/auth/hooks/use-admin-auth';
import { ApiClientError } from '@/lib/api/client';

const AVATAR_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_MAX_MB = Math.round(AVATAR_MAX_BYTES / 1024 / 1024);

interface FormValues {
  name: string;
}

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function ProfileAccountForm({ admin }: { admin: AdminDto }) {
  const t = useTranslations('profile');
  const update = useUpdateAdminProfile();
  const uploadAvatar = useUploadAdminAvatar();
  const removeAvatar = useRemoveAdminAvatar();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const schema = useMemo(
    () =>
      z.object({ name: z.string().trim().min(1, t('account.validation.name-required')).max(120) }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: admin.name },
  });

  useEffect(() => {
    reset({ name: admin.name });
  }, [admin, reset]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const name = watch('name');
  const displayedAvatar = avatarPreview ?? (avatarRemoved ? null : admin.avatar);
  const avatarDirty = avatarFile !== null || avatarRemoved;
  const pending = update.isPending || uploadAvatar.isPending || removeAvatar.isPending;

  const onPickFile = (): void => fileInputRef.current?.click();

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!AVATAR_MIMES.includes(file.type)) {
      toast.error(t('avatar.invalid-type'));
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(t('avatar.too-large', { mb: AVATAR_MAX_MB }));
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

  const clearStagedAvatar = (): void => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(false);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!isDirty && !avatarDirty) {
      return;
    }

    try {
      if (isDirty) {
        await update.mutateAsync({ name: values.name.trim() });
      }

      if (avatarFile) {
        await uploadAvatar.mutateAsync(avatarFile);
      } else if (avatarRemoved) {
        await removeAvatar.mutateAsync();
      }

      clearStagedAvatar();
      toast.success(t('account.success'));
    } catch (err) {
      toast.error(messageFromError(err, t('account.error')));
    }
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight">{t('account.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('account.description')}</p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-6">
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
              user={{ name: name || admin.name, avatar: displayedAvatar }}
              size="3xl"
              className="ring-2 ring-border"
            />

            {displayedAvatar ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t('avatar.edit-label')}
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
                    {t('avatar.replace')}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={onStageRemove}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('avatar.remove')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                type="button"
                onClick={onPickFile}
                disabled={pending}
                aria-label={t('avatar.upload-label')}
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
            {t('avatar.helper', { mb: AVATAR_MAX_MB })}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">{t('account.name')}</Label>
            <Input
              id="profile-name"
              autoComplete="name"
              placeholder={t('account.name-placeholder')}
              {...register('name')}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-email">{t('account.email')}</Label>
            <Input id="profile-email" type="email" value={admin.email} readOnly disabled />
            <p className="text-xs text-muted-foreground">{t('account.email-helper')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              admin.role?.permissionType === 'ALL'
                ? 'border-warning/30 bg-warning/10 text-warning'
                : 'border-border bg-muted text-muted-foreground',
            )}
          >
            {admin.role?.permissionType === 'ALL' ? <Crown className="h-3 w-3" /> : null}
            {admin.role?.name ?? '-'}
          </span>

          <Button type="submit" disabled={pending || (!isDirty && !avatarDirty)}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? t('account.saving') : t('account.save')}
          </Button>
        </div>
      </form>
    </section>
  );
}
