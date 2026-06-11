'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
import { useCreateAdminInvite } from '@/features/accounts/hooks/use-admin-accounts';
import { useAdminRoles } from '@/features/rbac/hooks/use-admin-roles';
import { ApiClientError } from '@/lib/api/client';

const DEFAULT_ROLE_ID = 'role_sys_member';

interface FormValues {
  email: string;
  name: string;
  roleId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InviteAdminDialog({ open, onClose }: Props) {
  const t = useTranslations('accounts');
  const invite = useCreateAdminInvite();
  const rolesQuery = useAdminRoles();
  const roles = rolesQuery.data?.items ?? [];

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('invite-dialog.validation.invalid-email')),
        name: z.string().min(1, t('invite-dialog.validation.name-required')).max(120),
        roleId: z.string().min(1),
      }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '', roleId: DEFAULT_ROLE_ID },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await invite.mutateAsync(values);

      toast.success(t('invite-dialog.success', { email: values.email }));

      form.reset();

      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('invite-dialog.error');

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
          <DialogTitle>{t('invite-dialog.title')}</DialogTitle>
          <DialogDescription>{t('invite-dialog.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">{t('invite-dialog.name')}</Label>
            <Input id="invite-name" autoComplete="off" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">{t('invite-dialog.email')}</Label>
            <Input id="invite-email" type="email" autoComplete="off" {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-role">{t('invite-dialog.role')}</Label>
            <Select value={form.watch('roleId')} onValueChange={(v) => form.setValue('roleId', v)}>
              <SelectTrigger id="invite-role">
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
            <Button type="button" variant="outline" onClick={close} disabled={invite.isPending}>
              {t('invite-dialog.cancel')}
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? t('invite-dialog.submitting') : t('invite-dialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
