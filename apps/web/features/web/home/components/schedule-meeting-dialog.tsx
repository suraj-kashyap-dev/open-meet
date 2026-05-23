'use client';

import { ArrowRight, CalendarClock, Check, Copy, Download, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
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

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: "Doesn't repeat" },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function ScheduleMeetingDialog({ open, onOpenChange }: ScheduleMeetingDialogProps) {
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
      toast.error(`Not a valid email: ${invalid.join(', ')}`);
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
      toast.error('Give your meeting a title');
      return;
    }

    const scheduledFor = new Date(startAt);

    if (Number.isNaN(scheduledFor.getTime())) {
      toast.error('Pick a valid date and time');
      return;
    }

    if (scheduledFor.getTime() < Date.now() - 60_000) {
      toast.error('Pick a future date and time');
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
        toast.success(
          `Scheduled — invites sent to ${finalInvitees.length} guest${finalInvitees.length === 1 ? '' : 's'}`,
        );
      } else {
        toast.success('Meeting scheduled');
      }
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not schedule meeting';
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
      toast.success('Meeting link copied');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-130">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-accent" />
            {result ? 'Meeting scheduled' : 'Schedule a meeting'}
          </DialogTitle>

          <DialogDescription>
            {result
              ? 'Share the link, or download the .ics to add it to any calendar.'
              : 'Pick a time, invite guests, and we will email the calendar invite.'}
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
              <Label htmlFor="meeting-title">Title</Label>
              <Input
                id="meeting-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly sync"
                autoFocus
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meeting-start">Date &amp; time</Label>
                <Input
                  id="meeting-start"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="meeting-duration">Duration</Label>
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
                        {formatDuration(min)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-recurrence">Repeat</Label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger id="meeting-recurrence">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meeting-invitees">
                Invite guests <span className="text-muted-foreground">(optional)</span>
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
                placeholder="alice@example.com"
                className={cn(inviteeFocused && 'ring-2 ring-ring')}
              />

              <p className="text-xs text-muted-foreground">
                Press Enter or comma after each email. They will get an email with the invite + .ics
                file.
              </p>

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
                        aria-label={`Remove ${email}`}
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
                Cancel
              </Button>

              <Button type="submit" disabled={schedule.isPending}>
                {schedule.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Scheduling…
                  </>
                ) : (
                  <>
                    <CalendarClock className="h-3.5 w-3.5" />
                    Schedule
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
              Link copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </>
          )}
        </Button>

        <Button asChild type="button" variant="outline">
          <a href={meetingsApi.icsUrl(result.code)} download={`${result.code}.ics`}>
            <Download className="h-3.5 w-3.5" />
            Download .ics
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onSchedule}>
          <X className="h-3.5 w-3.5" />
          Schedule another
        </Button>

        <Button asChild type="button" onClick={onClose}>
          <Link href={`/${result.code}/lobby`}>
            Open lobby
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

function formatDuration(min: number): string {
  if (min < 60) {
    return `${min} min`;
  }

  const h = Math.floor(min / 60);
  const m = min % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
