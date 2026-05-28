'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ConversationDto } from '@open-meet/types';
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

import { ApiClientError } from '@/lib/api/client';

import { useUpdateGroup } from '../hooks/use-chat';

export function GroupEditDialog({
  open,
  onOpenChange,
  conversation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDto;
}) {
  const t = useTranslations('chat');
  const update = useUpdateGroup(conversation.id);
  const [title, setTitle] = useState(conversation.title ?? '');
  const [description, setDescription] = useState(conversation.description ?? '');

  useEffect(() => {
    if (open) {
      setTitle(conversation.title ?? '');
      setDescription(conversation.description ?? '');
    }
  }, [open, conversation.title, conversation.description]);

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) return;
    try {
      await update.mutateAsync({
        title: trimmedTitle,
        description: description.trim() || null,
      });
      toast.success(t('group.edit-saved'));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('group.action-failed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('group.edit-title')}</DialogTitle>
          <DialogDescription>{t('group.edit-subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('group.name-label')}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('group.description-label')}
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('group.cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={title.trim().length === 0 || update.isPending}
          >
            {t('group.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
