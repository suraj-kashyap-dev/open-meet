'use client';

import { Camera, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ConversationDto } from '@open-meet/types';
import { Button } from '@open-meet/ui/button';
import { cn } from '@open-meet/ui/cn';
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
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';
import { Input } from '@open-meet/ui/input';
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { ApiClientError } from '@/lib/api/client';

import { useDeleteGroupAvatar, useUpdateGroup, useUploadGroupAvatar } from '../hooks/use-chat';

const GROUP_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const GROUP_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

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
  const accountT = useTranslations('account');
  const update = useUpdateGroup(conversation.id);
  const uploadAvatar = useUploadGroupAvatar(conversation.id);
  const deleteAvatar = useDeleteGroupAvatar(conversation.id);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(conversation.title ?? '');
  const [description, setDescription] = useState(conversation.description ?? '');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const pending = update.isPending || uploadAvatar.isPending || deleteAvatar.isPending;

  useEffect(() => {
    if (open) {
      setTitle(conversation.title ?? '');

      setDescription(conversation.description ?? '');

      setSelectedImage(null);

      setPreviewImage(null);

      setRemoveImage(false);
    }
  }, [open, conversation.title, conversation.description]);

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const onPickFile = (): void => {
    fileInputRef.current?.click();
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (!GROUP_IMAGE_MIMES.includes(file.type)) {
      toast.error(accountT('validation.avatar-invalid-type'));

      return;
    }

    if (file.size > GROUP_IMAGE_MAX_BYTES) {
      toast.error(
        accountT('validation.avatar-too-large', {
          mb: Math.round(GROUP_IMAGE_MAX_BYTES / 1024 / 1024),
        }),
      );

      return;
    }

    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedImage(file);

    setPreviewImage(URL.createObjectURL(file));

    setRemoveImage(false);
  };

  const onRemoveImage = (): void => {
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }

    setSelectedImage(null);

    setPreviewImage(null);

    setRemoveImage(true);
  };

  const submit = async () => {
    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      return;
    }

    try {
      await update.mutateAsync({
        title: trimmedTitle,
        description: description.trim() || null,
      });

      if (selectedImage) {
        await uploadAvatar.mutateAsync(selectedImage);
      } else if (removeImage && conversation.avatar) {
        await deleteAvatar.mutateAsync();
      }

      toast.success(t('group.edit-saved'));

      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('group.action-failed'));
    }
  };

  const displayedAvatar = removeImage ? null : (previewImage ?? conversation.avatar);
  const hasDisplayedAvatar = Boolean(displayedAvatar);
  const editImageLabel = hasDisplayedAvatar
    ? accountT('avatar.edit-label')
    : accountT('avatar.upload-label');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('group.edit-title')}</DialogTitle>
          <DialogDescription>{t('group.edit-subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              {accountT('profile.image-title')}
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={GROUP_IMAGE_MIMES.join(',')}
                className="hidden"
                onChange={onFileChange}
              />
              <div className="relative shrink-0">
                {removeImage ? (
                  <span
                    aria-hidden
                    className="block h-11 w-11 rounded-full border border-dashed border-border bg-muted/40 ring-1 ring-border"
                  />
                ) : (
                  <UserAvatar
                    user={{
                      name: title.trim() || conversation.title || '?',
                      avatar: displayedAvatar,
                    }}
                    size="xl"
                    className="ring-1 ring-border"
                  />
                )}
                {hasDisplayedAvatar ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={editImageLabel}
                      disabled={pending}
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full',
                        'border border-border bg-background text-foreground shadow-sm',
                        'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        'disabled:pointer-events-none disabled:opacity-60',
                      )}
                    >
                      {uploadAvatar.isPending || deleteAvatar.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pencil className="h-3 w-3" />
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="w-48">
                      <DropdownMenuItem onSelect={onPickFile}>
                        <Camera className="h-4 w-4" />
                        {accountT('avatar.replace')}
                      </DropdownMenuItem>
                      {conversation.avatar || selectedImage ? (
                        <DropdownMenuItem
                          onSelect={onRemoveImage}
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          {accountT('avatar.remove')}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <button
                    type="button"
                    onClick={onPickFile}
                    disabled={pending}
                    aria-label={editImageLabel}
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full',
                      'border border-border bg-background text-foreground shadow-sm',
                      'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      'disabled:pointer-events-none disabled:opacity-60',
                    )}
                  >
                    {uploadAvatar.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{accountT('avatar.helper')}</p>
            </div>
          </div>

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
          <Button onClick={submit} disabled={title.trim().length === 0 || pending}>
            {t('group.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
