'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@open-meet/ui/card';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';

import { MemberMultiSelect } from '@/components/shared/member-multi-select';
import { useAddTeamMembers, useCreateTeam } from '@/features/teams/hooks/use-admin-teams';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function CountBadge({ count }: { count: number }) {
  return (
    <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {count}
    </div>
  );
}

export function CreateTeamPage() {
  const t = useTranslations('teams');
  const router = useRouter();
  const create = useCreateTeam();
  const addMembers = useAddTeamMembers();

  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const isSubmitting = create.isPending || addMembers.isPending;

  const onSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    try {
      const team = await create.mutateAsync(name.trim());

      if (memberIds.length > 0) {
        await addMembers.mutateAsync({ id: team.id, userIds: memberIds });
      }

      toast.success(t('create.success'));
      router.replace(`/teams/${team.id}`);
    } catch (err) {
      toast.error(messageFromError(err, t('create.error')));
    }
  };

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="w-fit gap-2 px-0 hover:bg-transparent">
          <Link href="/teams">
            <ArrowLeft className="h-4 w-4" />
            {t('title')}
          </Link>
        </Button>

        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('create.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </header>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{t('manage.title')}</CardTitle>
                <CardDescription>{t('manage.members', { count: memberIds.length })}</CardDescription>
              </div>
              <CountBadge count={memberIds.length} />
            </div>
          </CardHeader>
          <CardContent>
            <MemberMultiSelect
              selectedIds={memberIds}
              onSelectedIdsChange={setMemberIds}
              searchPlaceholder={t('manage.search')}
              emptyLabel={t('manage.no-users')}
              removeLabel={t('manage.remove')}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>{t('create.name')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="team-name">{t('create.name')}</Label>
                <Input
                  id="team-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('create.placeholder')}
                  maxLength={120}
                  autoFocus
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => void onSubmit()}
              disabled={!name.trim() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('create.submit')}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
