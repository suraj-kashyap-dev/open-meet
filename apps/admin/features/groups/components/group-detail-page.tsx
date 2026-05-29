'use client';

import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
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
  useAdminGroup,
  useDeleteGroup,
  useSyncGroupMembers,
  useUpdateGroup,
} from '@/features/groups/hooks/use-admin-groups';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

function messageFromError(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function GroupDetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
      <div className="h-[32rem] animate-pulse rounded-2xl border border-border bg-card" />
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
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

export function GroupDetailPage({ groupId }: { groupId: string }) {
  const t = useTranslations('groups');
  const common = useTranslations('common');
  const router = useRouter();

  const groupQuery = useAdminGroup(groupId);
  const update = useUpdateGroup();
  const syncMembers = useSyncGroupMembers();
  const del = useDeleteGroup();

  const [title, setTitle] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const initializedGroupId = useRef<string | null>(null);

  const group = groupQuery.data;
  const members = group?.members ?? [];

  useEffect(() => {
    if (!group || initializedGroupId.current === group.id) {
      return;
    }

    initializedGroupId.current = group.id;
    setTitle(group.title);
    setMemberIds(group.members.map((member) => member.userId));
  }, [group]);

  const isLoading = groupQuery.isLoading;
  const isMissing = !isLoading && (!group || groupQuery.isError);
  const titleDirty = group ? title.trim() !== group.title : false;
  const memberDirty = group
    ? group.members.map((member) => member.userId).sort().join('|') !== [...memberIds].sort().join('|')
    : false;
  const isSaving = update.isPending || syncMembers.isPending;

  const onSave = async () => {
    if (!group || !title.trim() || (!titleDirty && !memberDirty)) {
      return;
    }

    try {
      if (titleDirty) {
        await update.mutateAsync({ id: group.id, body: { title: title.trim() } });
      }

      if (memberDirty) {
        await syncMembers.mutateAsync({
          id: group.id,
          currentUserIds: group.members.map((member) => member.userId),
          nextUserIds: memberIds,
        });
      }

      toast.success(t('detail.rename-success'));
    } catch (err) {
      toast.error(messageFromError(err, t('detail.request-error')));
    }
  };

  const onDeleteGroup = async () => {
    if (!group) {
      return;
    }

    try {
      await del.mutateAsync(group.id);
      toast.success(t('detail.delete-success'));
      router.replace('/groups');
    } catch (err) {
      toast.error(messageFromError(err, t('detail.delete-error')));
    }
  };

  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="w-fit gap-2 px-0 hover:bg-transparent">
          <Link href="/groups">
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
              {isLoading ? common('loading') : group?.title ?? t('detail.empty-title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>

          {group ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void onDeleteGroup()}
                disabled={del.isPending}
                className="gap-2 text-destructive hover:text-destructive"
              >
                {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('actions.delete')}
              </Button>
              <Button
                onClick={() => void onSave()}
                disabled={!title.trim() || (!titleDirty && !memberDirty) || isSaving}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSaving ? t('detail.rename-submitting') : t('detail.rename-submit')}
              </Button>
            </div>
          ) : null}
        </header>
      </div>

      {isLoading ? <GroupDetailSkeleton /> : null}

      {isMissing ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t('detail.empty-title')}</CardTitle>
            <CardDescription>{t('detail.empty-description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/groups">{t('title')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && group ? (
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
                    <Label htmlFor="group-title">{t('create.name')}</Label>
                    <Input
                      id="group-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={t('create.placeholder')}
                      maxLength={120}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </main>
  );
}
