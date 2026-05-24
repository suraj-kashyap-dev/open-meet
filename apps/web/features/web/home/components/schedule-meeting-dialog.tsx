'use client';

import { ArrowRight, CalendarClock, Check, Copy, Download, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';

import { Link } from '@/i18n/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-meet/ui/select';
import { meetingsApi } from '@/features/web/meeting/services/meetings';
import { useScheduleMeeting } from '@/features/web/meeting/hooks/use-meetings';
import { ApiClientError } from '@/lib/api/client';
import { cn } from '@open-meet/ui/cn';

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScheduledResult {
  code: string;
  title: string;
  scheduledFor: string;
}

const RECURRENCE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'none', labelKey: 'schedule.repeat-none' },
  { value: 'FREQ=DAILY', labelKey: 'schedule.repeat-daily' },
  { value: 'FREQ=WEEKLY', labelKey: 'schedule.repeat-weekly' },
  { value: 'FREQ=MONTHLY', labelKey: 'schedule.repeat-monthly' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function ScheduleMeetingDialog({ open, onOpenChange }: ScheduleMeetingDialogProps) {
  const t = useTranslations('home');
  const defaultStart = useMemo(() => nextRoundedHour(), []);

  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState(defaultStart);
  const [durationMin, setDurationMin] = useState(30);
  const [recurrence, setRecurrence] = useState('none');
  const [invitees, setInvitees] = useState<string[]>([]);
  const [inviteeInput, setInviteeInput] = useState('');
  const [inviteeFocused, setInviteeFocused] = useState(false);
  const [result, setResult] = useState<ScheduledResult | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteeInputRef = useRef<HTMLInputElement>(null);

  const schedule = useScheduleMeeting();

  const reset = () => {
    setTitle('');
    setStartAt(nextRoundedHour());
    setDurationMin(30);
    setRecurrence('none');
    setInvitees([]);
    setInviteeInput('');
    setResult(null);
    setCopied(false);
  };

  const commitInvitees = (raw: string): boolean => {
    const candidates = raw
      .split(/[,;\s\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (candidates.length === 0) {
      return false;
    }

    const invalid: string[] = [];
    const next = [...invitees];
    const seen = new Set(next.map((e) => e.toLowerCase()));

    for (const email of candidates) {
      if (!isValidEmail(email)) {
        invalid.push(email);
        continue;
      }

      const key = email.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      next.push(email);
    }

    if (invalid.length > 0) {
      toast.error(t('toast.invalid-email', { emails: invalid.join(', ') }));
    }

    setInvitees(next);

    return invalid.length === 0;
  };

  const removeInviteeAt = (idx: number) => {
    setInvitees((prev) => prev.filter((_, i) => i !== idx));
  };

  const onInviteeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (inviteeInput.trim().length === 0) {
        if (e.key === 'Tab') {
          return;
        }

        e.preventDefault();
        return;
      }

      e.preventDefault();

      if (commitInvitees(inviteeInput)) {
        setInviteeInput('');
      }

      return;
    }

    if (e.key === 'Backspace' && inviteeInput.length === 0 && invitees.length > 0) {
      e.preventDefault();
      removeInviteeAt(invitees.length - 1);
    }
  };

  const onInviteePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');

    if (!/[,;\s\n]/.test(text)) {
      return;
    }

    e.preventDefault();

    if (commitInvitees(text)) {
      setInviteeInput('');
    }
  };

  const onInviteeBlur = () => {
    setInviteeFocused(false);

    if (inviteeInput.trim().length === 0) {
      return;
    }

    if (commitInvitees(inviteeInput)) {
      setInviteeInput('');
    }
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);

    if (!next) {
      window.setTimeout(reset, 200);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      toast.error(t('toast.title-required'));
      return;
    }

    const scheduledFor = new Date(startAt);

    if (Number.isNaN(scheduledFor.getTime())) {
      toast.error(t('toast.valid-datetime'));
      return;
    }

    if (scheduledFor.getTime() < Date.now() - 60_000) {
      toast.error(t('toast.future-datetime'));
      return;
    }

    const pending = inviteeInput.trim();
    let finalInvitees = invitees;

    if (pending.length > 0) {
      if (!commitInvitees(pending)) {
        return;
      }

      finalInvitees = dedupeEmails([...invitees, pending]);
      setInviteeInput('');
    }

    try {
      const meeting = await schedule.mutateAsync({
        title: trimmedTitle,
        scheduledFor: scheduledFor.toISOString(),
        durationMin,
        recurrence: recurrence === 'none' ? null : recurrence,
        invitees: finalInvitees,
      });

      setResult({
        code: meeting.code,
        title: trimmedTitle,
        scheduledFor: meeting.scheduledFor ?? scheduledFor.toISOString(),
      });

      if (finalInvitees.length > 0) {
        toast.success(t('toast.scheduled-invites', { count: finalInvitees.length }));
      } else {
        toast.success(t('toast.scheduled'));
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('toast.schedule-error');
      toast.error(message);
    }
  };

  const onCopyLink = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${result.code}`);
      setCopied(true);
      toast.success(t('toast.link-copied'));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('toast.link-copy-error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            {result ? t('schedule.result-title') : t('schedule.title')}
          </DialogTitle>

          <DialogDescription>
            {result ? t('schedule.result-description') : t('schedule.description')}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <ScheduledSummary
            result={result}
            copied={copied}
            onCopyLink={onCopyLink}
            onSchedule={() => {
              setResult(null);
              setCopied(false);
            }}
            onClose={() => handleOpenChange(false)}
          />
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-title">{t('schedule.title-label')}</Label>
              <Input
                id="meeting-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('schedule.title-placeholder')}
                autoFocus
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meeting-start">{t('schedule.datetime-label')}</Label>
                <Input
                  id="meeting-start"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meeting-duration">{t('schedule.duration-label')}</Label>
                <Select
                  value={String(durationMin)}
                  onValueChange={(v) => setDurationMin(Number(v))}
                >
                  <SelectTrigger id="meeting-duration">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {DURATION_OPTIONS.map((min) => (
                      <SelectItem key={min} value={String(min)}>
                        {formatDuration(min, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-recurrence">{t('schedule.repeat-label')}</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger id="meeting-recurrence">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-invitees">
                {t('schedule.guests-label')}{' '}
                <span className="text-muted-foreground">{t('schedule.guests-optional')}</span>
              </Label>

              <Input
                ref={inviteeInputRef}
                id="meeting-invitees"
                type="text"
                value={inviteeInput}
                onChange={(e) => setInviteeInput(e.target.value)}
                onKeyDown={onInviteeKeyDown}
                onPaste={onInviteePaste}
                onFocus={() => setInviteeFocused(true)}
                onBlur={onInviteeBlur}
                placeholder={t('schedule.guests-placeholder')}
                className={cn(inviteeFocused && 'ring-2 ring-ring')}
              />

              <p className="text-xs text-muted-foreground">{t('schedule.guests-helper')}</p>

              {invitees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {invitees.map((email, idx) => (
                    <span
                      key={`${email}-${idx}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground"
                    >
                      {email}

                      <button
                        type="button"
                        onClick={() => removeInviteeAt(idx)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                        aria-label={t('schedule.remove-guest-aria', { email })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                {t('schedule.cancel')}
              </Button>

              <Button type="submit" disabled={schedule.isPending}>
                {schedule.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('schedule.scheduling')}
                  </>
                ) : (
                  <>
                    <CalendarClock className="h-3.5 w-3.5" />
                    {t('schedule.schedule')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScheduledSummary({
  result,
  copied,
  onCopyLink,
  onSchedule,
  onClose,
}: {
  result: ScheduledResult;
  copied: boolean;
  onCopyLink: () => void;
  onSchedule: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('home');
  const when = new Date(result.scheduledFor).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium">{result.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{when}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{result.code}</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onCopyLink}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" />
              {t('schedule.copied')}
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              {t('schedule.copy-link')}
            </>
          )}
        </Button>

        <Button asChild type="button" variant="outline">
          <a href={meetingsApi.icsUrl(result.code)} download={`${result.code}.ics`}>
            <Download className="h-3.5 w-3.5" />
            {t('schedule.download-ics')}
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onSchedule}>
          <X className="h-3.5 w-3.5" />
          {t('schedule.schedule-another')}
        </Button>

        <Button asChild type="button" onClick={onClose}>
          <Link href={`/${result.code}/lobby`}>
            {t('schedule.open-lobby')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function nextRoundedHour(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function dedupeEmails(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const email of list) {
    const key = email.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(email);
  }

  return out;
}

function formatDuration(min: number, t: (key: string, values?: Record<string, number>) => string) {
  if (min < 60) {
    return t('duration.minutes-long', { count: min });
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0
    ? t('duration.hours', { count: h })
    : t('duration.hours-minutes', { hours: h, minutes: m });
}
