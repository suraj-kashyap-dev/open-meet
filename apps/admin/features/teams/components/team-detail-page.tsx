'use client';

import { ArrowLeft, Hash, Loader2, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@open-meet/ui/card';
import { Input } from '@open-meet/ui/input';
import { Label } from '@open-meet/ui/label';

import { MemberMultiSelect } from '@/components/shared/member-multi-select';
import {
  useAdminTeam,
  useCreateChannel,
  useDeleteChannel,
  useDeleteTeam,
  useSyncTeamMembers,
  useTeamChannels,
  useUpdateTeam,
} from '@/features/teams/hooks/use-admin-teams';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function TeamDetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
      <div className="h-[34rem] animate-pulse rounded-2xl border border-border bg-card" />
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      {count}
    </div>
  );
}

export function TeamDetailPage({ teamId }: { teamId: string }) {
  const t = useTranslations('teams');
  const common = useTranslations('common');
  const router = useRouter();

  const teamQuery = useAdminTeam(teamId);
  const channelsQuery = useTeamChannels(teamId);
  const update = useUpdateTeam();
  const syncMembers = useSyncTeamMembers();
  const createChannel = useCreateChannel();
  const deleteChannel = useDeleteChannel();
  const del = useDeleteTeam();

  const [name, setName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [channelName, setChannelName] = useState('');
  const initializedTeamId = useRef<string | null>(null);

  const team = teamQuery.data;
  const members = team?.members ?? [];
  const channels = channelsQuery.data?.items ?? [];

  useEffect(() => {
    if (!team || initializedTeamId.current === team.id) {
      return;
    }

    initializedTeamId.current = team.id;
    setName(team.name);
    setMemberIds(team.members.map((member) => member.userId));
  }, [team]);

  const isLoading = teamQuery.isLoading;
  const isMissing = !isLoading && (!team || teamQuery.isError);
  const nameDirty = team ? name.trim() !== team.name : false;
  const memberDirty = team
    ? team.members.map((member) => member.userId).sort().join('|') !== [...memberIds].sort().join('|')
    : false;
  const isSaving = update.isPending || syncMembers.isPending;

  const onSave = async () => {
    if (!team || !name.trim() || (!nameDirty && !memberDirty)) {
      return;
    }

    try {
      if (nameDirty) {
        await update.mutateAsync({ id: team.id, body: { name: name.trim() } });
      }

      if (memberDirty) {
        await syncMembers.mutateAsync({
          id: team.id,
          currentUserIds: team.members.map((member) => member.userId),
          nextUserIds: memberIds,
        });
      }

      toast.success(t('detail.rename-success'));
    } catch (err) {
      toast.error(messageFromError(err, t('detail.request-error')));
    }
  };

  const onCreateChannel = async () => {
    if (!team || !channelName.trim()) {
      return;
    }

    try {
      await createChannel.mutateAsync({ teamId: team.id, name: channelName.trim() });
      setChannelName('');
    } catch (err) {
      toast.error(messageFromError(err, t('detail.request-error')));
    }
  };

  const onDeleteChannel = async (channelId: string) => {
    if (!team) {
      return;
    }

    try {
      await deleteChannel.mutateAsync({ teamId: team.id, channelId });
    } catch (err) {
      toast.error(messageFromError(err, t('detail.request-error')));
    }
  };

  const onDeleteTeam = async () => {
    if (!team) {
      return;
    }

    try {
      await del.mutateAsync(team.id);
      toast.success(t('detail.delete-success'));
      router.replace('/teams');
    } catch (err) {
      toast.error(messageFromError(err, t('detail.delete-error')));
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

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t('eyebrow')}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {isLoading ? common('loading') : team?.name ?? t('detail.empty-title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>

          {team ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void onDeleteTeam()}
                disabled={del.isPending}
                className="gap-2 text-destructive hover:text-destructive"
              >
                {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('actions.delete')}
              </Button>
              <Button
                onClick={() => void onSave()}
                disabled={!name.trim() || (!nameDirty && !memberDirty) || isSaving}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSaving ? t('detail.rename-submitting') : t('detail.rename-submit')}
              </Button>
            </div>
          ) : null}
        </header>
      </div>

      {isLoading ? <TeamDetailSkeleton /> : null}

      {isMissing ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t('detail.empty-title')}</CardTitle>
            <CardDescription>{t('detail.empty-description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/teams">{t('title')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && team ? (
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
                initialSelectedUsers={members.map((member) => ({
                  id: member.userId,
                  name: member.name,
                  email: member.email,
                  avatar: member.avatar,
                }))}
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
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="team-name">{t('create.name')}</Label>
                    <Input
                      id="team-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder={t('create.placeholder')}
                      maxLength={120}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{t('channels.title')}</CardTitle>
                  <CountBadge count={channels.length} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 border-b border-border pb-6">
                  <div className="flex items-center gap-2">
                    <Input
                      value={channelName}
                      onChange={(event) => setChannelName(event.target.value)}
                      placeholder={t('channels.name-placeholder')}
                      maxLength={120}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void onCreateChannel();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      aria-label={t('channels.add')}
                      disabled={!channelName.trim() || createChannel.isPending}
                      onClick={() => void onCreateChannel()}
                    >
                      {createChannel.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {channelsQuery.isLoading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {common('loading')}
                  </div>
                ) : channels.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {t('channels.empty')}
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {channels.map((channel) => (
                      <li
                        key={channel.id}
                        className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/30"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium">{channel.name}</p>
                            {channel.isGeneral ? (
                              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                {t('channels.general')}
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {t('manage.members', { count: channel.memberCount })}
                          </p>
                        </div>
                        {!channel.isGeneral ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            aria-label={t('channels.delete')}
                            disabled={deleteChannel.isPending}
                            onClick={() => void onDeleteChannel(channel.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </main>
  );
}
