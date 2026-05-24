'use client';

import { ArrowRight, Plus, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import { Card, CardContent } from '@open-meet/ui/card';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';
import { ShimmerButton } from '@open-meet/ui/shimmer-button';
import { useCreateMeeting } from '@/features/web/meeting/hooks/use-meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { ApiClientError } from '@/lib/api/client';

export function HomeActions() {
  const t = useTranslations('home');
  const nav = useNavigateTransition();
  const createMeeting = useCreateMeeting();
  const [code, setCode] = useState('');

  const creating = createMeeting.isPending || nav.isNavigating;

  const onCreate = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});
      nav.push(`/${meeting.code}/lobby`);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : t('toast.create-error');
      toast.error(message);
    }
  };

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) {
      toast.error(t('toast.enter-code'));
      return;
    }
    nav.push(`/${trimmed}/lobby`);
  };

  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
      <Card className="group relative flex flex-col overflow-hidden border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        <CardContent className="flex flex-1 flex-col items-start gap-5 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Plus className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-medium">{t('actions.start-title')}</h2>
            <p className="text-sm text-muted-foreground">{t('actions.start-description')}</p>
          </div>
          <ShimmerButton
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="mt-auto w-full"
          >
            {creating ? (
              <>{t('actions.creating')}</>
            ) : (
              <>
                <Video className="h-4 w-4" />
                {t('actions.new-meeting')}
              </>
            )}
          </ShimmerButton>
        </CardContent>
      </Card>

      <Card className="group flex flex-col border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:border-foreground/30 hover:shadow-lg">
        <CardContent className="flex flex-1 flex-col gap-5 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
            <ArrowRight className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-medium">{t('actions.join-title')}</h2>
            <p className="text-sm text-muted-foreground">{t('actions.join-description')}</p>
          </div>
          <form onSubmit={onJoin} className="mt-auto space-y-3">
            <div className="space-y-2">
              <Label htmlFor="join-code" className="sr-only">
                {t('actions.code-label')}
              </Label>
              <Input
                id="join-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="abcd-efgh-ijkl"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={nav.isNavigating}>
              {nav.isNavigating ? t('actions.joining') : t('actions.join')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
