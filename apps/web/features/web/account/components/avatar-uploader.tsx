'use client';

import { Camera, Loader2, Pencil, Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { toast } from 'sonner';

import type { UserDto } from '@open-meet/types';

import { UserAvatar } from '@/components/shared/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteAvatar, useUploadAvatar } from '@/features/web/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

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

    if (!file) {
      return;
    }

    if (!AVATAR_MIMES.includes(file.type)) {
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

  const editLabel = user.avatar ? 'Edit profile picture' : 'Upload profile picture';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_MIMES.join(',')}
        className="hidden"
        onChange={onFileChange}
      />

      <div className="relative shrink-0">
        <UserAvatar user={user} size="3xl" className="ring-2 ring-border" />

        {user.avatar ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={editLabel}
              disabled={pending}
              className={cn(
                'absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full',
                'border border-border bg-background text-foreground shadow-sm',
                'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:pointer-events-none disabled:opacity-60',
              )}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={6} className="w-48">
              <DropdownMenuItem onSelect={onPickFile}>
                <Camera className="h-4 w-4" />
                Replace
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={onRemove}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            type="button"
            onClick={onPickFile}
            disabled={pending}
            aria-label={editLabel}
            className={cn(
              'absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full',
              'border border-border bg-background text-foreground shadow-sm',
              'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:pointer-events-none disabled:opacity-60',
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        PNG, JPEG, WebP or GIF. Up to 5 MB. Square images look best.
      </p>
    </div>
  );
}
