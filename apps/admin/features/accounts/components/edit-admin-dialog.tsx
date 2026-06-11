'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { AdminAccountDto } from '@open-meet/types';

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
import { useUpdateAdminAccount } from '@/features/accounts/hooks/use-admin-accounts';
import { useAdminRoles } from '@/features/rbac/hooks/use-admin-roles';
import { ApiClientError } from '@/lib/api/client';

const DEFAULT_ROLE_ID = 'role_sys_member';

interface FormValues {
  name: string;
  roleId: string;
}

interface Props {
  admin: AdminAccountDto | null;
  onClose: () => void;
}

export function EditAdminDialog({ admin, onClose }: Props) {
  const t = useTranslations('accounts');
  const update = useUpdateAdminAccount();
  const rolesQuery = useAdminRoles();
  const roles = rolesQuery.data?.items ?? [];

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('edit-dialog.validation.name-required')).max(120),
        roleId: z.string().min(1),
      }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', roleId: DEFAULT_ROLE_ID },
  });

  const { reset } = form;

  useEffect(() => {
    if (admin) {
      reset({ name: admin.name, roleId: admin.role?.id ?? DEFAULT_ROLE_ID });
    }
  }, [admin, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!admin) {
      return;
    }

    try {
      await update.mutateAsync({ id: admin.id, dto: values });

      toast.success(t('edit-dialog.success', { name: values.name }));

      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('edit-dialog.error');

      toast.error(message);
    }
  });

  return (
    <Dialog open={Boolean(admin)} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('edit-dialog.title')}</DialogTitle>
          <DialogDescription>{admin?.email}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">{t('edit-dialog.name')}</Label>
            <Input id="edit-name" autoComplete="off" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role">{t('edit-dialog.role')}</Label>
            <Select value={form.watch('roleId')} onValueChange={(v) => form.setValue('roleId', v)}>
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
              {t('edit-dialog.cancel')}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? t('edit-dialog.submitting') : t('edit-dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
