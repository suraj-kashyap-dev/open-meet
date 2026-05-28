'use client';

import { UserPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@open-meet/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@open-meet/ui/dialog';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { MemberPicker } from '@/components/shared/member-picker';
import {
  useAddGroupMembers,
  useAdminGroup,
  useRemoveGroupMember,
} from '@/features/groups/hooks/use-admin-groups';

export function ManageGroupDialog({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('groups');
  const { data: group } = useAdminGroup(open ? groupId : null);
  const add = useAddGroupMembers();
  const remove = useRemoveGroupMember();
  const [toAdd, setToAdd] = useState<string[]>([]);

  const members = group?.members ?? [];

  const addMembers = () => {
    if (toAdd.length === 0) return;
    add.mutate({ id: groupId, userIds: toAdd }, { onSuccess: () => setToAdd([]) });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setToAdd([]);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group?.title ?? t('manage.title')}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t('manage.members', { count: members.length })}
        </p>

        <ul className="max-h-48 divide-y divide-border overflow-y-auto">
          {members.length === 0 ? (
            <li className="py-6 text-center text-xs text-muted-foreground">{t('manage.empty')}</li>
          ) : (
            members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3 py-2">
                <UserAvatar user={member} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{member.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  aria-label={t('manage.remove')}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ id: groupId, userId: member.userId })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))
          )}
        </ul>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">{t('manage.add')}</p>
          <MemberPicker
            selected={toAdd}
            onSelectedChange={setToAdd}
            excludeIds={members.map((m) => m.userId)}
            searchPlaceholder={t('manage.search')}
            emptyLabel={t('manage.no-users')}
          />
          <Button
            className="w-full gap-1.5"
            disabled={toAdd.length === 0 || add.isPending}
            onClick={addMembers}
          >
            <UserPlus className="h-4 w-4" />
            {t('manage.add-confirm')}
            {toAdd.length > 0 ? ` (${toAdd.length})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
