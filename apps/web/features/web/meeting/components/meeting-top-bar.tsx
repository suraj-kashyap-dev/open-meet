'use client';

import { Check, Loader2, Pencil, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { Label } from '@open-meet/ui/label';
import { useUpdateMeeting } from '@/features/web/meeting/hooks/use-meetings';
import { useMeetingStore } from '@/features/web/meeting/stores';
import { ApiClientError } from '@/lib/api/client';
import { cn } from '@open-meet/ui/cn';

interface Props {
  code: string;
  canEdit: boolean;
}

export function MeetingTopBar({ code, canEdit }: Props) {
  const t = useTranslations('meeting');
  const liveMeeting = useMeetingStore((s) => s.meeting);
  const title = liveMeeting && liveMeeting.code === code ? liveMeeting.title : null;
  const updateMeeting = useUpdateMeeting(code);

  const [renameOpen, setRenameOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const display = title ?? t('top-bar.untitled');
  const isPlaceholder = !title;

  const openRename = () => {
    setDraft(title ?? '');
    setRenameOpen(true);
  };

  const submit = async () => {
    const trimmed = draft.trim();
    const next = trimmed.length === 0 ? null : trimmed;

    if (next === (title ?? null)) {
      setRenameOpen(false);
      return;
    }

    try {
      await updateMeeting.mutateAsync({ title: next });
      setRenameOpen(false);
      toast.success(t('toast.title-updated'));
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('toast.update-title-error');
      toast.error(message);
    }
  };

  return (
    <>
      <div
        data-hide-in-fullscreen
        className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/50 px-4 backdrop-blur-sm"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent ring-1 ring-accent/20">
            <Video className="h-3.5 w-3.5" />
          </span>

          <div className="flex min-w-0 flex-col leading-tight">
            <span
              className={cn(
                'truncate text-sm font-semibold tracking-tight',
                isPlaceholder ? 'text-muted-foreground' : 'text-foreground',
              )}
              title={display}
            >
              {display}
            </span>

            <span className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {code}
            </span>
          </div>
        </div>

        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openRename}
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('top-bar.rename')}</span>
          </Button>
        ) : null}
      </div>

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          if (!open && updateMeeting.isPending) {
            return;
          }

          setRenameOpen(open);
        }}
      >
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-7 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/25">
              <Pencil className="h-5 w-5" />
            </div>

            <DialogHeader className="space-y-1.5 text-center sm:text-center">
              <DialogTitle className="text-xl">{t('top-bar.rename-title')}</DialogTitle>
              <DialogDescription className="text-balance">
                {t('top-bar.rename-description')}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-2 px-6 py-5">
            <Label htmlFor="rename-meeting-title">{t('top-bar.meeting-title')}</Label>
            <Input
              id="rename-meeting-title"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={t('top-bar.title-placeholder')}
              maxLength={200}
              disabled={updateMeeting.isPending}
              className="h-11"
            />
            <p className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('top-bar.clear-hint')}</span>
              <span className="font-mono tabular-nums">
                {t('top-bar.char-count', { count: draft.length })}
              </span>
            </p>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={updateMeeting.isPending}
              className="sm:min-w-24"
            >
              {t('top-bar.cancel')}
            </Button>
            <Button onClick={() => void submit()} disabled={updateMeeting.isPending}>
              {updateMeeting.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {updateMeeting.isPending ? t('top-bar.saving') : t('top-bar.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
