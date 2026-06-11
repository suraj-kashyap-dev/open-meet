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
  max?: number;
  authToken?: string | null;
  onCapacityExceeded?: (max: number) => void;
  onUploadError?: (message: string) => void;
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
