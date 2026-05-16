'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User as UserIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser, useUpdateProfile } from '@/hooks/client/use-auth';
import { ApiClientError } from '@/lib/shared/api';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name is too long'),
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

export function ProfileForm() {
  const { data: user, isLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name });
    }
  }, [user, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await updateProfile.mutateAsync(values);

      reset({ name: updated.name });
      toast.success('Profile updated');
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Failed to update profile';

      toast.error(message);
    }
  });

  if (isLoading || ! user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Account
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Update how your name appears in meetings and chat.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-accent/15 text-lg font-semibold text-accent">
              {initialsOf(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-medium">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>

            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                aria-invalid={Boolean(errors.name)}
                className="h-11 pl-9"
                {...register('name')}
              />
            </div>

            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                id="email"
                type="email"
                value={user.email}
                readOnly
                disabled
                className="h-11 pl-9"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Email cannot be changed at this time.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={! isDirty || isSubmitting || updateProfile.isPending}
              onClick={() => reset({ name: user.name })}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={! isDirty || isSubmitting || updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
