'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@open-meet/ui/dialog';
import { cn } from '@open-meet/ui/cn';

export function MediaLightbox({
  src,
  alt = '',
  title,
  className,
  thumbClassName,
  download,
}: {
  src: string;
  alt?: string;
  title?: string;
  className?: string;
  thumbClassName?: string;
  download?: string;
}) {
  const [open, setOpen] = useState(false);
  const filename = download ?? src.split('/').pop()?.split('?')[0] ?? 'image';
  const label = title ?? alt ?? filename;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={cn(
          'group block overflow-hidden rounded-lg border border-border bg-muted outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent',
          className,
        )}
      >
        <img
          src={src}
          alt={alt}
          crossOrigin="use-credentials"
          loading="lazy"
          className={cn('block transition-transform group-hover:scale-[1.01]', thumbClassName)}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] gap-0 border-0 bg-transparent p-2 shadow-none sm:max-w-[90vw]">
          <DialogTitle className="sr-only">{label}</DialogTitle>

          <div className="relative flex items-center justify-center">
            <img
              src={src}
              alt={alt}
              crossOrigin="use-credentials"
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            />

            <a
              href={src}
              download={filename}
              aria-label="Download"
              className="absolute start-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/70 text-background backdrop-blur transition-colors hover:bg-foreground/90"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
