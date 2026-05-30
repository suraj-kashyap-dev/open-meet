'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';

import { useCreateTeam } from '@/features/teams/hooks/use-admin-teams';
import { ApiClientError } from '@/lib/api/client';

export function CreateTeamDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('teams');
  const [name, setName] = useState('');
  const create = useCreateTeam();

  const submit = async () => {
    if (!name.trim()) {
      return;
    }

    try {
      await create.mutateAsync(name.trim());
      toast.success(t('create.success'));
      setName('');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('create.error'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setName('');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="team-name">{t('create.name')}</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('create.placeholder')}
            maxLength={120}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={!name.trim() || create.isPending}>
            {t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
