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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';
import { Textarea } from '@open-meet/ui/textarea';

import { useAdminAccounts } from '@/features/accounts/hooks/use-admin-accounts';
import { useCreateDepartment } from '@/features/departments/hooks/use-admin-departments';
import { ApiClientError } from '@/lib/api/client';

const NO_RESPONSIBLE = '__none__';

export function CreateDepartmentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('departments');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleAdminId, setResponsibleAdminId] = useState<string>(NO_RESPONSIBLE);
  const create = useCreateDepartment();
  const accounts = useAdminAccounts();

  const reset = () => {
    setName('');
    setDescription('');
    setResponsibleAdminId(NO_RESPONSIBLE);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    try {
      await create.mutateAsync({
        name: trimmed,
        description: description.trim() ? description.trim() : null,
        responsibleAdminId: responsibleAdminId === NO_RESPONSIBLE ? null : responsibleAdminId,
      });
      toast.success(t('create.success'));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('create.error'));
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
          <DialogTitle>{t('create.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="department-name">{t('create.name')}</Label>
            <Input
              id="department-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('create.placeholder')}
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="department-description">{t('form.description')}</Label>
            <Textarea
              id="department-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.description-placeholder')}
              maxLength={500}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('form.responsible')}</Label>
            <Select value={responsibleAdminId} onValueChange={setResponsibleAdminId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('form.responsible-placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_RESPONSIBLE}>{t('form.responsible-none')}</SelectItem>
                {(accounts.data?.items ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => void submit()} disabled={!name.trim() || create.isPending}>
            {t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
