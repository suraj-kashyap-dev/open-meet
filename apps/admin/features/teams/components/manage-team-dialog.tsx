'use client';

import { Hash, Plus, UserPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@open-meet/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@open-meet/ui/dialog';
import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { MemberPicker } from '@/components/shared/member-picker';
import {
  useAddTeamMembers,
  useAdminTeam,
  useCreateChannel,
  useDeleteChannel,
  useRemoveTeamMember,
  useTeamChannels,
} from '@/features/teams/hooks/use-admin-teams';

export function ManageTeamDialog({
  teamId,
  open,
  onOpenChange,
}: {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('teams');
  const { data: team } = useAdminTeam(open ? teamId : null);
  const add = useAddTeamMembers();
  const remove = useRemoveTeamMember();
  const channels = useTeamChannels(open ? teamId : null);
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [channelName, setChannelName] = useState('');

  const members = team?.members ?? [];
  const channelItems = channels.data?.items ?? [];

  const addMembers = () => {
    if (toAdd.length === 0) return;
    add.mutate({ id: teamId, userIds: toAdd }, { onSuccess: () => setToAdd([]) });
  };

  const addChannel = () => {
    const name = channelName.trim();
    if (!name) return;
    createChannel.mutate({ teamId, name }, { onSuccess: () => setChannelName('') });
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
          <DialogTitle>{team?.name ?? t('manage.title')}</DialogTitle>
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
                  onClick={() => remove.mutate({ id: teamId, userId: member.userId })}
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

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">{t('channels.title')}</p>
          <ul className="space-y-0.5">
            {channelItems.length === 0 ? (
              <li className="py-2 text-center text-xs text-muted-foreground">
                {t('channels.empty')}
              </li>
            ) : (
              channelItems.map((channel) => (
                <li key={channel.id} className="flex items-center gap-2 py-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{channel.name}</span>
                  {channel.isGeneral ? (
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {t('channels.general')}
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      aria-label={t('channels.delete')}
                      disabled={deleteChannel.isPending}
                      onClick={() => deleteChannel.mutate({ teamId, channelId: channel.id })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))
            )}
          </ul>
          <div className="flex items-center gap-2">
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder={t('channels.name-placeholder')}
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addChannel();
                }
              }}
            />
            <Button
              size="icon"
              aria-label={t('channels.add')}
              disabled={!channelName.trim() || createChannel.isPending}
              onClick={addChannel}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
