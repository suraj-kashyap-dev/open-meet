'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { UserDto } from '@open-meet/types';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateProfile } from '@/features/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';

import { FormActions } from './form-actions';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  bio: z.string().trim().max(500, 'Bio is too long').optional().or(z.literal('')),
});

type Values = z.infer<typeof schema>;

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function ProfileEditForm({ user }: { user: UserDto }) {
  const updateProfile = useUpdateProfile();

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

      toast.success('Profile updated');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to update profile'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>

          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />

          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Shown in meetings and chats.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            value={user.email}
            readOnly
            disabled
            className="cursor-not-allowed"
          />

          <p className="text-xs text-muted-foreground">
            Used for sign-in. Email changes aren't available yet.
          </p>
        </div>
      </div>

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
          placeholder="A short note about you."
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
