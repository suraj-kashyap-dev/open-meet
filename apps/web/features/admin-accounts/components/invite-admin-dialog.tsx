'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AdminRole } from '@open-meet/types';

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
import { useInviteAdminAccount } from '@/features/admin-accounts/hooks/use-admin-accounts';
import { ApiClientError } from '@/lib/api/client';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(1, 'Name is required').max(120),
  password: z.string().min(8, 'At least 8 characters').max(200),
  role: z.enum([AdminRole.ADMIN, AdminRole.SUPERADMIN]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function InviteAdminDialog({ open, onClose }: Props) {
  const invite = useInviteAdminAccount();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '', password: '', role: AdminRole.ADMIN },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await invite.mutateAsync(values);
      toast.success(`Invited ${values.name}`);
      form.reset();
      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not invite admin';
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
          <DialogTitle>Invite an admin</DialogTitle>
          <DialogDescription>
            Creates a new admin account immediately. Share the credentials securely.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Name</Label>
            <Input id="invite-name" autoComplete="off" {...form.register('name')} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" autoComplete="off" {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-password">Temporary password</Label>
            <Input
              id="invite-password"
              type="text"
              autoComplete="off"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(v) => form.setValue('role', v as AdminRole)}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AdminRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={AdminRole.SUPERADMIN}>Superadmin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={close} disabled={invite.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending ? 'Inviting…' : 'Invite admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
