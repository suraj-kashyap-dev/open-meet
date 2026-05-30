'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { AdminTeamDto } from '@open-meet/types';

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

import { MemberMultiSelect } from '@/components/shared/member-multi-select';
import {
  useAdminTeam,
  useSyncTeamMembers,
  useUpdateTeam,
} from '@/features/teams/hooks/use-admin-teams';
import { ApiClientError } from '@/lib/api/client';

interface Props {
  team: AdminTeamDto | null;
  onClose: () => void;
}

export function EditTeamDialog({ team, onClose }: Props) {
  const t = useTranslations('teams');
  const open = team !== null;
  const detail = useAdminTeam(team?.id ?? null);
  const update = useUpdateTeam();
  const syncMembers = useSyncTeamMembers();

  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (detail.data) {
      setName(detail.data.name);
      setMemberIds(detail.data.members.map((member) => member.userId));
    }
  }, [detail.data]);

  const isSaving = update.isPending || syncMembers.isPending;

  const onSubmit = async () => {
    if (!team || !name.trim()) {
      return;
    }

    const current = detail.data?.members.map((member) => member.userId) ?? [];
    const nameDirty = name.trim() !== (detail.data?.name ?? team.name);
    const memberDirty = [...current].sort().join('|') !== [...memberIds].sort().join('|');

    if (!nameDirty && !memberDirty) {
      onClose();
      return;
    }

    try {
      if (nameDirty) {
        await update.mutateAsync({ id: team.id, body: { name: name.trim() } });
      }

      if (memberDirty) {
        await syncMembers.mutateAsync({
          id: team.id,
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
          <DialogTitle>{team?.name ?? t('actions.manage')}</DialogTitle>
          <DialogDescription>{t('manage.members', { count: memberIds.length })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-team-name">{t('create.name')}</Label>
            <Input
              id="edit-team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('create.placeholder')}
              maxLength={120}
            />
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
