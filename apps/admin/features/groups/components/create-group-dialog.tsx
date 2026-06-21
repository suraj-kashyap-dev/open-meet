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

import { MemberMultiSelect } from '@/components/shared/member-multi-select';
import { useCreateGroup } from '@/features/groups/hooks/use-admin-groups';
import { ApiClientError } from '@/lib/api/client';

export function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('groups');
  const [title, setTitle] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const create = useCreateGroup();

  const reset = () => {
    setTitle('');

    setMemberIds([]);
  };

  const submit = async () => {
    if (!title.trim() || memberIds.length === 0) {
      return;
    }

    try {
      await create.mutateAsync({ title: title.trim(), memberIds: Array.from(new Set(memberIds)) });

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
        if (!next) {
          reset();
        }

        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="group-title">{t('create.name')}</Label>
          <Input
            id="group-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('create.placeholder')}
            maxLength={120}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            {t('create.choose-members')}
            {memberIds.length > 0 ? ` (${memberIds.length})` : ''}
          </Label>
          <MemberMultiSelect
            selectedIds={memberIds}
            onSelectedIdsChange={setMemberIds}
            searchPlaceholder={t('manage.search')}
            emptyLabel={t('manage.no-users')}
            removeLabel={t('manage.remove')}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!title.trim() || memberIds.length === 0 || create.isPending}
          >
            {t('create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
