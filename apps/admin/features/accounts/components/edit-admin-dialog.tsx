'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { type AdminAccountDto, AdminRole } from '@open-meet/types';

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
import { ApiClientError } from '@/lib/api/client';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  role: z.enum([AdminRole.ADMIN, AdminRole.SUPERADMIN]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  admin: AdminAccountDto | null;
  onClose: () => void;
}

export function EditAdminDialog({ admin, onClose }: Props) {
  const update = useUpdateAdminAccount();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', role: AdminRole.ADMIN },
  });

  const { reset } = form;
  useEffect(() => {
    if (admin) {
      reset({ name: admin.name, role: admin.role });
    }
  }, [admin, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!admin) {
      return;
    }

    try {
      await update.mutateAsync({ id: admin.id, dto: values });
      toast.success(`Updated ${values.name}`);
      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not update admin';
      toast.error(message);
    }
  });

  return (
    <Dialog open={Boolean(admin)} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit admin</DialogTitle>
          <DialogDescription>{admin?.email}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" autoComplete="off" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(v) => form.setValue('role', v as AdminRole)}
            >
              <SelectTrigger id="edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AdminRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={AdminRole.SUPERADMIN}>Superadmin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
