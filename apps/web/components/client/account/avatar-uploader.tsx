'use client';

import { Camera, Loader2, Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { toast } from 'sonner';

import type { UserDto } from '@open-meet/types';

import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { useDeleteAvatar, useUploadAvatar } from '@/hooks/client/use-auth';
import { ApiClientError } from '@/lib/shared/api';

const AVATAR_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export function AvatarUploader({ user }: { user: UserDto }) {
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pending = uploadAvatar.isPending || deleteAvatar.isPending;

  const onPickFile = (): void => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (! file) {
      return;
    }

    if (! AVATAR_MIMES.includes(file.type)) {
      toast.error('Avatar must be a PNG, JPEG, WebP, or GIF image');
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(`Avatar must be under ${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)} MB`);
      return;
    }

    try {
      await uploadAvatar.mutateAsync(file);
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to upload avatar'));
    }
  };

  const onRemove = async (): Promise<void> => {
    try {
      await deleteAvatar.mutateAsync();
      toast.success('Avatar removed');
    } catch (err) {
      toast.error(messageFromError(err, 'Failed to remove avatar'));
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <UserAvatar user={user} size="3xl" className="ring-2 ring-border" />

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">

          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_MIMES.join(',')}
            className="hidden"
            onChange={onFileChange}
          />

          <Button
            type="button"
            size="sm"
            onClick={onPickFile}
            disabled={pending}
          >
            {uploadAvatar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {user.avatar ? 'Replace' : 'Upload'}
          </Button>

          {user.avatar ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onRemove}
              disabled={pending}
            >
              {deleteAvatar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove
            </Button>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          PNG, JPEG, WebP or GIF. Up to 5 MB. Square images look best.
        </p>
      </div>
    </div>
  );
}
