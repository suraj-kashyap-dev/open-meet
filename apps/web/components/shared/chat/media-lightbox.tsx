'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Download, Loader2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Dialog, DialogOverlay, DialogPortal } from '@open-meet/ui/dialog';
import { cn } from '@open-meet/ui/cn';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

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
        <DialogPortal>
          <DialogOverlay className="bg-black/90" />
          <DialogPrimitive.Content
            aria-label={label}
            className="fixed inset-0 z-50 flex flex-col focus:outline-none data-[state=closed]:animate-overlay-hide data-[state=open]:animate-overlay-show"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
            <ImageViewer
              src={src}
              alt={alt}
              filename={filename}
              label={label}
              onClose={() => setOpen(false)}
            />
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}

function ImageViewer({
  src,
  alt,
  filename,
  label,
  onClose,
}: {
  src: string;
  alt: string;
  filename: string;
  label: string;
  onClose: () => void;
}) {
  const t = useTranslations('chat');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setScale((current) => {
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.round((current + delta) * 100) / 100),
      );
      if (next === MIN_SCALE) {
        setOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  // Non-passive wheel listener so we can zoom instead of scrolling the page.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (scale === MIN_SCALE) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    setOffset({ x: drag.ox + (event.clientX - drag.x), y: drag.oy + (event.clientY - drag.y) });
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
    dragRef.current = null;
  };

  const zoomed = scale > MIN_SCALE;

  return (
    <>
      <header className="relative z-10 flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white/90" title={label}>
          {label}
        </p>

        <div className="flex items-center gap-1">
          <ViewerButton
            label={t('viewer.zoom-out')}
            onClick={() => zoomBy(-ZOOM_STEP)}
            disabled={scale <= MIN_SCALE}
          >
            <Minus className="h-4 w-4" />
          </ViewerButton>

          <button
            type="button"
            onClick={reset}
            disabled={!zoomed}
            aria-label={t('viewer.reset-zoom')}
            className="min-w-[3.25rem] rounded-md px-2 py-1 text-xs font-medium tabular-nums text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {Math.round(scale * 100)}%
          </button>

          <ViewerButton
            label={t('viewer.zoom-in')}
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={scale >= MAX_SCALE}
          >
            <Plus className="h-4 w-4" />
          </ViewerButton>

          <ViewerButton label={t('viewer.reset-zoom')} onClick={reset} disabled={!zoomed}>
            <RotateCcw className="h-4 w-4" />
          </ViewerButton>

          <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />

          <a
            href={src}
            download={filename}
            aria-label={t('viewer.download')}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Download className="h-4 w-4" />
          </a>

          <ViewerButton label={t('viewer.close')} onClick={onClose}>
            <X className="h-5 w-5" />
          </ViewerButton>
        </div>
      </header>

      <div
        ref={stageRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden px-3 pb-6 sm:px-6"
      >
        <img
          src={src}
          alt={alt}
          crossOrigin="use-credentials"
          draggable={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => (zoomed ? reset() : setScale(2))}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          className={cn(
            'max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-transform',
            zoomed ? (dragRef.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
            dragRef.current ? 'transition-none' : 'duration-150',
          )}
        />
      </div>
    </>
  );
}

function ViewerButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function PdfLightbox({
  src,
  label,
  className,
  children,
}: {
  src: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className={className}>
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/90" />
          <DialogPrimitive.Content
            aria-label={label}
            className="fixed inset-0 z-50 flex flex-col focus:outline-none data-[state=closed]:animate-overlay-hide data-[state=open]:animate-overlay-show"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
            <PdfViewer src={src} label={label} onClose={() => setOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}

function PdfViewer({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  const t = useTranslations('chat');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let created: string | undefined;

    setObjectUrl(null);
    setFailed(false);

    fetch(src, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load PDF (${response.status})`);
        }

        return response.blob();
      })
      .then((blob) => {
        if (!active) {
          return;
        }

        created = URL.createObjectURL(blob);

        setObjectUrl(created);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });

    return () => {
      active = false;

      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [src]);

  return (
    <>
      <header className="relative z-10 flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white/90" title={label}>
          {label}
        </p>

        <div className="flex items-center gap-1">
          <ViewerButton label={t('viewer.close')} onClick={onClose}>
            <X className="h-5 w-5" />
          </ViewerButton>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-white/70">{t('viewer.load-failed')}</p>
        ) : objectUrl ? (
          <iframe
            src={objectUrl}
            title={label}
            className="h-full w-full rounded-lg border-0 bg-white shadow-2xl"
          />
        ) : (
          <span className="flex items-center gap-2 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />

            {t('viewer.loading')}
          </span>
        )}
      </div>
    </>
  );
}
