'use client';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import type { AdminUserDto } from '@open-meet/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteAdminUser } from '@/features/admin/users/hooks/use-admin-users';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  user: AdminUserDto | null;
  onClose: () => void;
}

export function DeleteUserDialog({ user, onClose }: Props) {
  const del = useDeleteAdminUser();
  const open = user !== null;
  const pending = del.isPending;

  const onConfirm = async () => {
    if (!user) {
      return;
    }

    try {
      await del.mutateAsync(user.id);
      toast.success(`Deleted ${user.email}`);
      onClose();
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not delete user';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user?</DialogTitle>
          <DialogDescription>
            This permanently removes{' '}
            <span className="font-medium text-foreground">{user?.email}</span> and all meetings they
            hosted, participated in, and messages they sent. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? 'Deleting…' : 'Delete user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
