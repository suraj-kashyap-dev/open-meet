'use client';

import { File as FileIcon, FileText, X } from 'lucide-react';

import type { AttachmentDto } from '@open-meet/types';

import { env } from '@/lib/env';

import { MediaLightbox, PdfLightbox } from './media-lightbox';
import type { StagedAttachment } from './use-staged-attachments';

export function toAbsoluteMediaUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;

  return `${base}${path}`;
}

export function AttachmentBlock({
  a,
  formatSize,
}: {
  a: AttachmentDto;
  formatSize: (bytes: number) => string;
}) {
  const src = toAbsoluteMediaUrl(a.url);
  const filename = a.url.split('/').pop()?.split('?')[0];

  if (a.mime.startsWith('image/')) {
    return (
      <MediaLightbox
        src={src}
        alt={filename ?? ''}
        download={filename}
        className="max-w-xs"
        thumbClassName="max-h-72 w-full object-cover"
      />
    );
  }

  if (a.mime.startsWith('video/')) {
    return (
      <video
        src={src}
        controls
        preload="metadata"
        crossOrigin="use-credentials"
        className="block max-h-72 max-w-xs rounded-lg border border-border"
      />
    );
  }

  if (a.mime.startsWith('audio/')) {
    return (
      <audio
        src={src}
        controls
        preload="metadata"
        crossOrigin="use-credentials"
        className="block w-full max-w-xs"
      />
    );
  }

  if (a.mime === 'application/pdf') {
    return (
      <PdfLightbox
        src={src}
        filename={filename ?? 'document.pdf'}
        label={filename ?? a.mime}
        className="flex max-w-xs items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-start outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileText className="h-4 w-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{filename}</span>
          <span className="block text-xs text-muted-foreground">
            {a.mime} · {formatSize(a.size)}
          </span>
        </span>
      </PdfLightbox>
    );
  }

  return (
    <a
      href={src}
      download={filename}
      className="flex max-w-xs items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:bg-muted"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileIcon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{filename}</span>
        <span className="block text-xs text-muted-foreground">
          {a.mime} · {formatSize(a.size)}
        </span>
      </span>
    </a>
  );
}

export interface StagedAttachmentLabels {
  uploading: (percent: number) => string;
  failed: string;
  remove: string;
}

export function StagedAttachmentPreview({
  items,
  onRemove,
  formatSize,
  labels,
}: {
  items: StagedAttachment[];
  onRemove: (id: string) => void;
  formatSize: (bytes: number) => string;
  labels: StagedAttachmentLabels;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-muted/30 px-3 py-2">
      <ul className="flex flex-wrap gap-2">
        {items.map((s) => (
          <li
            key={s.id}
            className="relative flex items-center gap-2 rounded-md border border-border bg-card p-1.5 pe-2"
          >
            {s.previewUrl ? (
              <img src={s.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                <FileIcon className="h-4 w-4" />
              </span>
            )}

            <div className="flex min-w-0 flex-col">
              <span className="max-w-[10rem] truncate text-xs font-medium">{s.file.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {s.status === 'uploading'
                  ? labels.uploading(Math.round(s.progress))
                  : s.status === 'failed'
                    ? (s.error ?? labels.failed)
                    : formatSize(s.file.size)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onRemove(s.id)}
              className="ms-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/80 text-background hover:bg-foreground"
              aria-label={labels.remove}
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
