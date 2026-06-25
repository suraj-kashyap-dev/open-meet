'use client';

import {
  LogOut,
  MoreVertical,
  Pencil,
  ShieldCheck,
  ShieldMinus,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ConversationDto, ConversationMemberDto } from '@open-meet/types';
import { Button } from '@open-meet/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

import { useDeleteGroup, useRemoveGroupMember, useSetGroupMemberRole } from '../hooks/use-chat';
import { useChatStore } from '../stores';
import { GroupEditDialog } from './group-edit-dialog';
import { GroupAddMembersDialog } from './group-add-members-dialog';
import { PresenceDot } from './presence-dot';

interface Props {
  conversation: ConversationDto;
  currentUserId: string | undefined;
}

type ConfirmAction =
  | { type: 'remove'; member: ConversationMemberDto }
  | { type: 'leave' }
  | { type: 'delete' };

export function GroupInfoPanel({ conversation, currentUserId }: Props) {
  const t = useTranslations('chat');
  const router = useRouter();
  const setInfoOpen = useChatStore((s) => s.setInfoOpen);

  const removeMember = useRemoveGroupMember(conversation.id);
  const setRole = useSetGroupMemberRole(conversation.id);
  const deleteGroup = useDeleteGroup();

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const youAreAdmin = conversation.youAreAdmin;
  const adminCount = conversation.members.filter((m) => m.role === 'ADMIN').length;

  const uniqueMembers = Array.from(
    new Map(conversation.members.map((member) => [member.userId, member])).values(),
  );

  const sortedMembers = uniqueMembers.sort((a, b) => {
    if (a.role === b.role) {
      return a.name.localeCompare(b.name);
    }

    return a.role === 'ADMIN' ? -1 : 1;
  });

  const isLastAdmin = youAreAdmin && adminCount === 1;

  const handleApiError = (err: unknown, fallback: string) =>
    toast.error(err instanceof ApiClientError ? err.message : fallback);

  const promote = async (member: ConversationMemberDto) => {
    try {
      await setRole.mutateAsync({ userId: member.userId, role: 'ADMIN' });

      toast.success(t('group.promoted'));
    } catch (err) {
      handleApiError(err, t('group.action-failed'));
    }
  };

  const demote = async (member: ConversationMemberDto) => {
    try {
      await setRole.mutateAsync({ userId: member.userId, role: 'MEMBER' });

      toast.success(t('group.demoted'));
    } catch (err) {
      handleApiError(err, t('group.action-failed'));
    }
  };

  const kick = async (member: ConversationMemberDto) => {
    try {
      await removeMember.mutateAsync(member.userId);

      setConfirmAction(null);

      toast.success(t('group.removed'));
    } catch (err) {
      handleApiError(err, t('group.action-failed'));
    }
  };

  const leave = async () => {
    if (!currentUserId) {
      return;
    }

    try {
      await removeMember.mutateAsync(currentUserId);

      setConfirmAction(null);

      toast.success(t('group.left'));

      router.push('/chat');
    } catch (err) {
      handleApiError(err, t('group.action-failed'));
    }
  };

  const requestLeave = () => {
    if (isLastAdmin) {
      toast.error(t('group.last-admin-warning'));

      return;
    }

    setConfirmAction({ type: 'leave' });
  };

  const destroy = async () => {
    try {
      await deleteGroup.mutateAsync(conversation.id);

      setConfirmAction(null);

      toast.success(t('group.deleted'));

      router.push('/chat');
    } catch (err) {
      handleApiError(err, t('group.action-failed'));
    }
  };

  const confirmDialog =
    confirmAction?.type === 'remove'
      ? {
          title: t('group.remove-member'),
          description: t('group.remove-member-confirm', { name: confirmAction.member.name }),
          actionLabel: t('group.remove-member'),
          pending: removeMember.isPending,
          onConfirm: () => kick(confirmAction.member),
        }
      : confirmAction?.type === 'leave'
        ? {
            title: t('group.leave'),
            description: t('group.leave-confirm'),
            actionLabel: t('group.leave'),
            pending: removeMember.isPending,
            onConfirm: leave,
          }
        : confirmAction?.type === 'delete'
          ? {
              title: t('group.delete'),
              description: t('group.delete-confirm'),
              actionLabel: t('group.delete'),
              pending: deleteGroup.isPending,
              onConfirm: destroy,
            }
          : null;

  const closeConfirm = () => {
    if (confirmDialog?.pending) {
      return;
    }

    setConfirmAction(null);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex min-h-[61px] items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">{t('info.title')}</p>
        <button
          type="button"
          onClick={() => setInfoOpen(false)}
          aria-label={t('info.close')}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border px-4 py-5 text-center">
          <UserAvatar
            user={{ name: conversation.title ?? t('list.untitled'), avatar: conversation.avatar }}
            size="3xl"
            className="mx-auto mb-3 ring-1 ring-border"
          />
          <p className="text-base font-semibold">{conversation.title ?? t('list.untitled')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('header.members', { count: conversation.members.length })}
          </p>
          {conversation.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {conversation.description}
            </p>
          ) : null}
          {youAreAdmin ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="mt-2 gap-1.5 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              {t('group.edit-details')}
            </Button>
          ) : null}
        </div>

        <div className="px-2 py-3">
          <div className="flex items-center justify-between px-2 pb-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('group.members-label')}
            </p>
            {youAreAdmin ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                aria-label={t('group.add-members')}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <ul className="space-y-0.5">
            {sortedMembers.map((member) => {
              const isYou = member.userId === currentUserId;
              const isAdmin = member.role === 'ADMIN';
              const canActOnRow = youAreAdmin || isYou;

              return (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <div className="relative shrink-0">
                    <UserAvatar user={{ name: member.name, avatar: member.avatar }} size="sm" />
                    <PresenceDot userId={member.userId} className="absolute -bottom-0.5 -end-0.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.name}
                      {isYou ? (
                        <span className="ms-1.5 text-xs text-muted-foreground">
                          ({t('group.you-badge')})
                        </span>
                      ) : null}
                    </p>
                    {isAdmin ? (
                      <p className="truncate text-xs text-accent">{t('group.admin-badge')}</p>
                    ) : null}
                  </div>

                  {canActOnRow && !isYou && youAreAdmin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={t('group.member-actions')}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isAdmin ? (
                          <DropdownMenuItem
                            onSelect={() => demote(member)}
                            disabled={adminCount === 1}
                          >
                            <ShieldMinus className="me-2 h-4 w-4" />
                            {t('group.demote')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => promote(member)}>
                            <ShieldCheck className="me-2 h-4 w-4" />
                            {t('group.promote')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setConfirmAction({ type: 'remove', member })}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserMinus className="me-2 h-4 w-4" />
                          {t('group.remove-member')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <footer className="space-y-1.5 border-t border-border p-3">
        <Button
          type="button"
          variant="ghost"
          onClick={requestLeave}
          className="w-full justify-start gap-2"
          disabled={removeMember.isPending}
        >
          <LogOut className="h-4 w-4" />
          {t('group.leave')}
        </Button>
        {youAreAdmin ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmAction({ type: 'delete' })}
            disabled={deleteGroup.isPending}
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t('group.delete')}
          </Button>
        ) : null}
      </footer>

      <GroupEditDialog open={editOpen} onOpenChange={setEditOpen} conversation={conversation} />
      <GroupAddMembersDialog open={addOpen} onOpenChange={setAddOpen} conversation={conversation} />

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => (!open ? closeConfirm() : null)}
      >
        {confirmDialog ? (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogDescription>{confirmDialog.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={closeConfirm} disabled={confirmDialog.pending}>
                {t('group.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDialog.onConfirm}
                disabled={confirmDialog.pending}
              >
                {confirmDialog.actionLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
