'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

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

import { useInviteUser } from '@/features/users/hooks/use-admin-users';
import { ApiClientError } from '@/lib/api/client';

export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('users');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const invite = useInviteUser();

  const reset = () => {
    setName('');
    setEmail('');
  };

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      return;
    }

    try {
      await invite.mutateAsync({ name: name.trim(), email: email.trim() });
      toast.success(t('invite.success', { email: email.trim() }));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('invite.error'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('invite.title')}</DialogTitle>
          <DialogDescription>{t('invite.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">{t('invite.name')}</Label>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">{t('invite.email')}</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@company.com"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={!name.trim() || !email.trim() || invite.isPending}>
            {t('invite.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
