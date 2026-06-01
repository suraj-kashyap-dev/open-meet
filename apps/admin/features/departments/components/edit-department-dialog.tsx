'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { AdminDepartmentDto, AdminUpdateDepartmentDto } from '@open-meet/types';

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
import { Textarea } from '@open-meet/ui/textarea';

import { MemberMultiSelect } from '@/components/shared/member-multi-select';
import { useAdminAccounts } from '@/features/accounts/hooks/use-admin-accounts';
import {
  useAdminDepartment,
  useSyncDepartmentMembers,
  useUpdateDepartment,
} from '@/features/departments/hooks/use-admin-departments';
import { ApiClientError } from '@/lib/api/client';

const NO_RESPONSIBLE = '__none__';

interface Props {
  department: AdminDepartmentDto | null;
  onClose: () => void;
}

export function EditDepartmentDialog({ department, onClose }: Props) {
  const t = useTranslations('departments');
  const open = department !== null;
  const detail = useAdminDepartment(department?.id ?? null);
  const update = useUpdateDepartment();
  const syncMembers = useSyncDepartmentMembers();
  const accounts = useAdminAccounts();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleAdminId, setResponsibleAdminId] = useState<string>(NO_RESPONSIBLE);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (detail.data) {
      setName(detail.data.name);
      setDescription(detail.data.description ?? '');
      setResponsibleAdminId(detail.data.responsibleAdminId ?? NO_RESPONSIBLE);
      setMemberIds(detail.data.members.map((member) => member.userId));
    }
  }, [detail.data]);

  const isSaving = update.isPending || syncMembers.isPending;

  const onSubmit = async () => {
    if (!department || !name.trim()) {
      return;
    }

    const current = detail.data?.members.map((member) => member.userId) ?? [];
    const nextResponsibleId = responsibleAdminId === NO_RESPONSIBLE ? null : responsibleAdminId;
    const nextDescription = description.trim() ? description.trim() : null;

    const patch: AdminUpdateDepartmentDto = {};
    if (name.trim() !== (detail.data?.name ?? department.name)) {
      patch.name = name.trim();
    }
    if (nextDescription !== (detail.data?.description ?? null)) {
      patch.description = nextDescription;
    }
    if (nextResponsibleId !== (detail.data?.responsibleAdminId ?? null)) {
      patch.responsibleAdminId = nextResponsibleId;
    }

    const memberDirty = [...current].sort().join('|') !== [...memberIds].sort().join('|');
    const departmentDirty = Object.keys(patch).length > 0;

    if (!departmentDirty && !memberDirty) {
      onClose();
      return;
    }

    try {
      if (departmentDirty) {
        await update.mutateAsync({ id: department.id, body: patch });
      }

      if (memberDirty) {
        await syncMembers.mutateAsync({
          id: department.id,
          currentUserIds: current,
          nextUserIds: memberIds,
        });
      }

      toast.success(t('detail.rename-success'));
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('detail.request-error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && !isSaving ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{department?.name ?? t('actions.manage')}</DialogTitle>
          <DialogDescription>{t('manage.members', { count: memberIds.length })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-department-name">{t('create.name')}</Label>
            <Input
              id="edit-department-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('create.placeholder')}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-department-description">{t('form.description')}</Label>
            <Textarea
              id="edit-department-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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

          <div className="space-y-1.5">
            <Label>{t('manage.title')}</Label>
            <MemberMultiSelect
              selectedIds={memberIds}
              onSelectedIdsChange={setMemberIds}
              initialSelectedUsers={(detail.data?.members ?? []).map((member) => ({
                id: member.userId,
                name: member.name,
                email: member.email,
                avatar: member.avatar,
              }))}
              searchPlaceholder={t('manage.search')}
              emptyLabel={t('manage.no-users')}
              removeLabel={t('manage.remove')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => void onSubmit()} disabled={!name.trim() || isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? t('detail.rename-submitting') : t('detail.rename-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
