'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AttachmentDto } from '@open-meet/types';

import { ApiClientError } from '@/lib/api/client';
import { uploadAttachment } from '@/features/web/account/services/uploads';

export interface StagedAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  status: 'uploading' | 'ready' | 'failed';
  progress: number;
  attachment?: AttachmentDto;
  error?: string;
}

export interface UseStagedAttachmentsOptions {
  /** Maximum number of attachments staged at once. */
  max?: number;
  /** Optional bearer token for guest meeting uploads. */
  authToken?: string | null;
  /** Called when a stage attempt exceeds the cap (no items are added). */
  onCapacityExceeded?: (max: number) => void;
  /** Called once per failed upload, with the resolved message. */
  onUploadError?: (message: string) => void;
  /** Maps an upload error to a user-facing message; defaults to ApiClientError.message. */
  resolveUploadError?: (err: unknown) => string;
}

export interface UseStagedAttachments {
  staged: StagedAttachment[];
  stageFiles: (files: FileList | null) => void;
  removeStaged: (id: string) => void;
  reset: () => void;
  hasUploading: boolean;
  readyAttachments: StagedAttachment[];
  readyAttachmentIds: string[];
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

/**
 * Staged-upload state machine shared by every message composer: pick files,
 * upload them with progress, surface failures, and expose the attachment ids
 * ready to send. Preview object URLs are revoked on remove/reset/unmount.
 */
export function useStagedAttachments(
  options: UseStagedAttachmentsOptions = {},
): UseStagedAttachments {
  const { max = 5, authToken, onCapacityExceeded, onUploadError, resolveUploadError } = options;

  const [staged, setStaged] = useState<StagedAttachment[]>([]);
  const stagedRef = useRef(staged);
  stagedRef.current = staged;

  const stageFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const available = max - stagedRef.current.length;

      if (available <= 0) {
        onCapacityExceeded?.(max);
        return;
      }

      const batch = Array.from(files).slice(0, available);

      const newItems: StagedAttachment[] = batch.map((file) => ({
        id: makeId(),
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        status: 'uploading',
        progress: 0,
      }));

      setStaged((prev) => [...prev, ...newItems]);

      newItems.forEach(async (item) => {
        try {
          const attachment = await uploadAttachment(item.file, {
            authToken,
            onProgress: (loaded, total) => {
              const pct = total > 0 ? (loaded / total) * 100 : 0;
              setStaged((prev) =>
                prev.map((s) => (s.id === item.id ? { ...s, progress: pct } : s)),
              );
            },
          });

          setStaged((prev) =>
            prev.map((s) =>
              s.id === item.id ? { ...s, status: 'ready', progress: 100, attachment } : s,
            ),
          );
        } catch (err) {
          const message = resolveUploadError
            ? resolveUploadError(err)
            : err instanceof ApiClientError
              ? err.message
              : 'Upload failed';
          setStaged((prev) =>
            prev.map((s) => (s.id === item.id ? { ...s, status: 'failed', error: message } : s)),
          );
          onUploadError?.(message);
        }
      });
    },
    [authToken, max, onCapacityExceeded, onUploadError, resolveUploadError],
  );

  const removeStaged = useCallback((id: string) => {
    setStaged((prev) => {
      const target = prev.find((s) => s.id === id);

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const reset = useCallback(() => {
    setStaged((prev) => {
      prev.forEach((s) => {
        if (s.previewUrl) {
          URL.revokeObjectURL(s.previewUrl);
        }
      });
      return [];
    });
  }, []);

  useEffect(() => {
    return () => {
      stagedRef.current.forEach((s) => {
        if (s.previewUrl) {
          URL.revokeObjectURL(s.previewUrl);
        }
      });
    };
  }, []);

  const readyAttachments = staged.filter((s) => s.status === 'ready' && s.attachment);

  return {
    staged,
    stageFiles,
    removeStaged,
    reset,
    hasUploading: staged.some((s) => s.status === 'uploading'),
    readyAttachments,
    readyAttachmentIds: readyAttachments.map((s) => s.attachment!.id),
  };
}
