'use client';

import { ArrowRight, Check, Copy, Lock, Pencil, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useUserSettings } from '@/features/web/account/hooks/use-settings';
import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useMediaDevices } from '@/features/web/lobby/hooks/use-media-devices';
import { useMeeting, useUpdateMeeting } from '@/features/web/meeting/hooks/use-meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { ApiClientError } from '@/lib/api/client';

import { saveJoinPreferences } from '@/features/web/lobby/lib/join-preferences';

import { DeviceSelector } from './device-selector';
import { LobbyPreview } from './lobby-preview';

export function LobbyClient({ code }: { code: string }) {
  const nav = useNavigateTransition();
  const media = useMediaDevices();
  const { data: meeting, error, isLoading } = useMeeting(code);
  const { data: user } = useCurrentUser();
  const { data: settings } = useUserSettings();
  const [copied, setCopied] = useState(false);
  const appliedDefaults = useRef(false);

  useEffect(() => {
    if (error instanceof ApiClientError && error.code === 'MEETING_NOT_FOUND') {
      toast.error('Meeting not found');
      nav.replace('/');
    }
  }, [error, nav]);

  // Apply the user's saved meeting defaults once the media stream is ready.
  // Guarded by a ref so a settings refetch can't clobber a manual toggle.
  useEffect(() => {
    if (appliedDefaults.current || !settings || !media.stream) {
      return;
    }
    appliedDefaults.current = true;
    const prefs = settings.meetingPreferences;
    if (prefs.defaultMicMuted) {
      void media.setMicEnabled(false);
    }
    if (prefs.defaultCameraOff) {
      void media.setCameraEnabled(false);
    }
  }, [settings, media]);

  const onCopyLink = async () => {
    if (!meeting) {
      return;
    }

    const url = `${window.location.origin}/${meeting.code}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Meeting link copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const onJoin = () => {
    saveJoinPreferences(code, {
      micEnabled: media.micEnabled,
      cameraEnabled: media.cameraEnabled,
    });
    media.stop();
    nav.push(`/${code}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  const displayName = user?.name ?? 'You';
  const isHost = Boolean(user && user.id === meeting.hostId);

  return (
    <div className="relative isolate min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 spotlight opacity-70" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-backdrop opacity-50" />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 pb-28 lg:py-12 lg:pb-12">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Get ready
          </p>

          <EditableTitle code={code} title={meeting.title} canEdit={isHost} />
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section className="space-y-4">
            <LobbyPreview media={media} displayName={displayName} avatar={user?.avatar ?? null} />

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Secure connection
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
                <Lock className="h-3.5 w-3.5" />
                Only invited people can join
              </span>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="space-y-2.5 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Meeting code
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
                    {meeting.code}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onCopyLink}
                    aria-label="Copy meeting link"
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4 p-5">
                <header className="space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Devices
                  </p>
                  <h3 className="text-sm font-semibold tracking-tight">Check your audio & video</h3>
                </header>
                <DeviceSelector media={media} />
              </div>
            </section>

            <div className="hidden space-y-2 pt-1 lg:block">
              <Button
                onClick={onJoin}
                disabled={nav.isNavigating}
                className="group w-full"
                size="lg"
              >
                {nav.isNavigating ? 'Joining…' : 'Join now'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link href="/" className="hover:text-foreground hover:underline">
                  Back to home
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Cancel
          </Link>
          <Button onClick={onJoin} disabled={nav.isNavigating} className="group flex-1" size="lg">
            {nav.isNavigating ? 'Joining…' : 'Join now'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EditableTitleProps {
  code: string;
  title: string | null;
  canEdit: boolean;
}

function EditableTitle({ code, title, canEdit }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const update = useUpdateMeeting(code);

  const display = title ?? 'Untitled meeting';

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

  if (!canEdit) {
    return <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{display}</h1>;
  }

  if (!isEditing) {
    return (
      <div className="group flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{display}</h1>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={openEditor}
          aria-label="Rename meeting"
          className="h-8 w-8 text-muted-foreground opacity-60 transition-opacity hover:text-foreground hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-w-md items-center gap-2">
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={200}
        placeholder="Untitled meeting"
        aria-label="Meeting title"
        disabled={update.isPending}
        className="h-10 text-lg font-semibold tracking-tight"
      />

      <Button
        type="button"
        size="icon"
        onClick={() => void save()}
        disabled={update.isPending}
        aria-label="Save title"
        className="h-9 w-9 shrink-0"
      >
        <Check className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={cancel}
        disabled={update.isPending}
        aria-label="Cancel rename"
        className="h-9 w-9 shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
