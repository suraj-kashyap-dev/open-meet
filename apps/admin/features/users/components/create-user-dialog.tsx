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

import { useCreateAdminUser } from '@/features/users/hooks/use-admin-users';
import { ApiClientError } from '@/lib/api/client';

interface FormValues {
  name: string;
  email: string;
  password: string;
}

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('users.create-dialog');
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
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  useEffect(() => {
    if (!open) {
      reset({ name: '', email: '', password: '' });
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const body: AdminCreateUserDto = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-user-name">{t('name')}</Label>
            <Input id="create-user-name" autoComplete="off" autoFocus {...register('name')} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
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

          <div className="space-y-1.5">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
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
