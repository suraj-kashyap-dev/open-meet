'use client';

import { ArrowLeft, Loader2, Trash2, UserPlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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
import { UserAvatar } from '@open-meet/ui/user-avatar';

import { MemberPicker } from '@/components/shared/member-picker';
import {
  useAddGroupMembers,
  useAdminGroup,
  useDeleteGroup,
  useRemoveGroupMember,
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
  const addMembers = useAddGroupMembers();
  const removeMember = useRemoveGroupMember();
  const del = useDeleteGroup();

  const [title, setTitle] = useState('');
  const [toAdd, setToAdd] = useState<string[]>([]);

  const group = groupQuery.data;
  const members = group?.members ?? [];

  useEffect(() => {
    if (group) {
      setTitle(group.title);
    }
  }, [group]);

  const isLoading = groupQuery.isLoading;
  const isMissing = !isLoading && (!group || groupQuery.isError);
  const titleDirty = group ? title.trim() !== group.title : false;

  const onRename = async () => {
    if (!group || !title.trim() || !titleDirty) {
      return;
    }

    try {
      await update.mutateAsync({ id: group.id, body: { title: title.trim() } });
      toast.success(t('detail.rename-success'));
    } catch (err) {
      toast.error(messageFromError(err, t('detail.request-error')));
    }
  };

  const onAddMembers = async () => {
    if (!group || toAdd.length === 0) {
      return;
    }

    try {
      await addMembers.mutateAsync({ id: group.id, userIds: toAdd });
      setToAdd([]);
    } catch (err) {
      toast.error(messageFromError(err, t('detail.request-error')));
    }
  };

  const onRemoveMember = async (userId: string) => {
    if (!group) {
      return;
    }

    try {
      await removeMember.mutateAsync({ id: group.id, userId });
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
                onClick={() => void onRename()}
                disabled={!title.trim() || !titleDirty || update.isPending}
                className="gap-2"
              >
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {update.isPending ? t('detail.rename-submitting') : t('detail.rename-submit')}
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
                  <CardDescription>{t('manage.members', { count: members.length })}</CardDescription>
                </div>
                <CountBadge count={members.length} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 border-b border-border pb-6">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {t('manage.add')}
                </p>
                <MemberPicker
                  selected={toAdd}
                  onSelectedChange={setToAdd}
                  excludeIds={members.map((member) => member.userId)}
                  searchPlaceholder={t('manage.search')}
                  emptyLabel={t('manage.no-users')}
                />
                <Button
                  onClick={() => void onAddMembers()}
                  disabled={toAdd.length === 0 || addMembers.isPending}
                  className="w-full gap-2 sm:w-auto"
                >
                  {addMembers.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {t('manage.add-confirm')}
                  {toAdd.length > 0 ? ` (${toAdd.length})` : ''}
                </Button>
              </div>

              {members.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {t('manage.empty')}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {members.map((member) => (
                    <li
                      key={member.userId}
                      className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/30"
                    >
                      <UserAvatar user={member} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        aria-label={t('manage.remove')}
                        disabled={removeMember.isPending}
                        onClick={() => void onRemoveMember(member.userId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
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
