'use client';

import { Check, Loader2, Pencil, Video, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUpdateMeeting } from '@/features/web/meeting/hooks/use-meetings';
import { ApiClientError } from '@/lib/api/client';
import { cn } from '@/lib/cn';

interface Props {
  code: string;
  title: string | null;
  canEdit: boolean;
}

export function MeetingTitleBar({ code, title, canEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const update = useUpdateMeeting(code);

  const display = title ?? 'Untitled meeting';
  const isPlaceholder = !title;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const openEditor = () => {
    setDraft(title ?? '');
    setIsEditing(true);
  };

  const cancel = () => {
    setIsEditing(false);
    setDraft('');
  };

  const save = async () => {
    const trimmed = draft.trim();
    const next = trimmed.length === 0 ? null : trimmed;

    if (next === (title ?? null)) {
      cancel();
      return;
    }

    try {
      await update.mutateAsync({ title: next });
      setIsEditing(false);
      setDraft('');
      toast.success('Meeting title updated');
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not update title';
      toast.error(message);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void save();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div
        className={cn(
          'group/title pointer-events-auto absolute left-3 top-3 z-10',
          'flex items-center gap-3 rounded-xl border border-border/60 bg-card/75 py-2 pl-2 pr-3 shadow-lg shadow-black/5 backdrop-blur-md',
          'transition-all duration-200 hover:border-border hover:bg-card/85',
          isEditing && 'border-accent/60 bg-card/95 ring-2 ring-accent/20',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-accent/20">
          <Video className="h-4 w-4" />
        </div>

        {isEditing ? (
          <div className="flex min-w-0 flex-col gap-1">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={200}
              placeholder="Untitled meeting"
              aria-label="Meeting title"
              disabled={update.isPending}
              className="w-[14rem] bg-transparent text-sm font-semibold tracking-tight text-foreground placeholder:text-muted-foreground/60 focus:outline-none sm:w-[18rem]"
            />

            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {code}
            </p>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col leading-tight">
            <p
              className={cn(
                'truncate text-sm font-semibold tracking-tight sm:text-[15px]',
                isPlaceholder ? 'text-muted-foreground' : 'text-foreground',
              )}
              title={display}
            >
              {display}
            </p>

            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {code}
            </p>
          </div>
        )}

        {canEdit ? (
          isEditing ? (
            <div className="ml-1 flex shrink-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => void save()}
                    disabled={update.isPending}
                    aria-label="Save title"
                    className="h-7 w-7"
                  >
                    {update.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Save · Enter</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={cancel}
                    disabled={update.isPending}
                    aria-label="Cancel rename"
                    className="h-7 w-7"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Cancel · Esc</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={openEditor}
                  aria-label="Rename meeting"
                  className={cn(
                    'ml-1 h-7 w-7 shrink-0 text-muted-foreground transition-opacity',
                    'opacity-0 group-hover/title:opacity-100 focus-visible:opacity-100',
                    isPlaceholder && 'opacity-100',
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Rename meeting</TooltipContent>
            </Tooltip>
          )
        ) : null}
      </div>
    </TooltipProvider>
  );
}
