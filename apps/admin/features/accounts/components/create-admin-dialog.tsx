'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AdminRole } from '@open-meet/types';

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
import { useCreateAdminAccount } from '@/features/accounts/hooks/use-admin-accounts';
import { ApiClientError } from '@/lib/api/client';

interface FormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: AdminRole;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateAdminDialog({ open, onClose }: Props) {
  const t = useTranslations('accounts');
  const create = useCreateAdminAccount();

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(1, t('create-dialog.validation.name-required')).max(120),
          email: z.string().email(t('create-dialog.validation.invalid-email')).max(254),
          password: z.string().min(8, t('create-dialog.validation.password-min')).max(200),
          confirmPassword: z.string(),
          role: z.enum([AdminRole.ADMIN, AdminRole.SUPERADMIN]),
        })
        .refine((v) => v.password === v.confirmPassword, {
          message: t('create-dialog.validation.password-mismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: AdminRole.ADMIN },
  });

  const onSubmit = form.handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
    try {
      await create.mutateAsync(values);
      toast.success(t('create-dialog.success', { name: values.name }));
      form.reset();
      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('create-dialog.error');
      toast.error(message);
    }
  });

  const close = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? close() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('create-dialog.title')}</DialogTitle>
          <DialogDescription>{t('create-dialog.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">{t('create-dialog.name')}</Label>
            <Input id="create-name" autoComplete="off" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-email">{t('create-dialog.email')}</Label>
            <Input id="create-email" type="email" autoComplete="off" {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-password">{t('create-dialog.password')}</Label>
            <Input
              id="create-password"
              type="password"
              autoComplete="new-password"
              placeholder={t('create-dialog.password-placeholder')}
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('create-dialog.password-helper')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-confirm-password">{t('create-dialog.confirm-password')}</Label>
            <Input
              id="create-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder={t('create-dialog.confirm-password-placeholder')}
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-role">{t('create-dialog.role')}</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(v) => form.setValue('role', v as AdminRole)}
            >
              <SelectTrigger id="create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AdminRole.ADMIN}>{t('create-dialog.role-admin')}</SelectItem>
                <SelectItem value={AdminRole.SUPERADMIN}>
                  {t('create-dialog.role-superadmin')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={close} disabled={create.isPending}>
              {t('create-dialog.cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t('create-dialog.submitting') : t('create-dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
