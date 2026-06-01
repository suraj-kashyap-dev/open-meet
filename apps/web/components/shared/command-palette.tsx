'use client';

import {
  AtSign,
  Bookmark,
  CalendarClock,
  History,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings,
  SquarePen,
  Sun,
  User,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { MeetingStatus, type MeetingHistoryItemDto } from '@open-meet/types';

import { previewText } from '@/components/shared/chat/format';
import { useCurrentUser, useLogout } from '@/features/web/auth/hooks/use-auth';
import { useConversations } from '@/features/web/chat/hooks/use-chat';
import { conversationDisplay } from '@/features/web/chat/lib/conversation-display';
import { ScheduleMeetingDialog } from '@/features/web/home/components/schedule-meeting-dialog';
import { useHistoryList } from '@/features/web/history/hooks/use-history';
import { useCreateMeeting, useUpcomingMeetings } from '@/features/web/meeting/hooks/use-meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { ApiClientError } from '@/lib/api/client';
import { cn } from '@open-meet/ui/cn';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@open-meet/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@open-meet/ui/dialog';
import { UserAvatar } from '@open-meet/ui/user-avatar';
import { useCommandPalette } from './command-palette-store';

interface ActionItem {
  key: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  visual?: ReactNode;
  meta?: string;
  metaTone?: 'default' | 'success';
  destructive?: boolean;
  disabled?: boolean;
  action: () => void;
}

export function CommandPalette() {
  const t = useTranslations('nav');
  const tHome = useTranslations('home');
  const tChat = useTranslations('chat');
  const tAccount = useTranslations('account');
  const open = useCommandPalette((s) => s.open);
  const setOpen = useCommandPalette((s) => s.setOpen);
  const toggle = useCommandPalette((s) => s.toggle);
  const [query, setQuery] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const nav = useNavigateTransition();
  const { data: user } = useCurrentUser();
  const { setTheme, resolvedTheme } = useTheme();
  const createMeeting = useCreateMeeting();
  const logout = useLogout();
  const conversations = useConversations({ enabled: open });
  const history = useHistoryList(1, 6, { enabled: open });
  const upcoming = useUpcomingMeetings({ enabled: open });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.shiftKey) {
        return;
      }

      if (!(e.metaKey || e.ctrlKey) || e.code !== 'KeyK') {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      toggle();
    };

    window.addEventListener('keydown', onKey, { capture: true });

    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [toggle]);

  const closePalette = () => {
    setOpen(false);
    setQuery('');
  };

  const runAction = (fn: () => void | Promise<void>) => {
    closePalette();
    void fn();
  };

  const openSchedule = () => {
    closePalette();

    window.setTimeout(() => {
      setScheduleOpen(true);
    }, 120);
  };

  const onCreateMeeting = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});
      nav.push(`/${meeting.code}/lobby`);
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : t('command.create-meeting-error');
      toast.error(message);
    }
  };

  const onJoin = () => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      toast.error(t('command.join-code-required'));
      return;
    }

    nav.push(`/${trimmed}/lobby`);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const matches = (values: Array<string | null | undefined>) =>
    normalizedQuery.length === 0 || matchesQuery(values, normalizedQuery);

  const navigationItems: ActionItem[] = [
    {
      key: 'chat',
      title: t('rail.chat'),
      description: tChat('list.subtitle'),
      icon: MessageSquare,
      action: () => runAction(() => nav.push('/chat')),
    },
    {
      key: 'meet',
      title: t('rail.meet'),
      description: tHome('page.subtitle'),
      icon: Video,
      action: () => runAction(() => nav.push('/meet')),
    },
    {
      key: 'activity',
      title: t('rail.activity'),
      description: tChat('activity.subtitle'),
      icon: AtSign,
      action: () => runAction(() => nav.push('/activity')),
    },
    {
      key: 'saved',
      title: t('rail.saved'),
      description: tChat('saved.subtitle'),
      icon: Bookmark,
      action: () => runAction(() => nav.push('/saved')),
    },
    {
      key: 'history',
      title: t('rail.history'),
      description: tAccount('sidebar.history-description'),
      icon: History,
      action: () => runAction(() => nav.push('/history')),
    },
  ].filter((item) => matches([item.title, item.description]));

  const meetingItems: ActionItem[] = [
    {
      key: 'new-meeting',
      title: t('command.new-meeting'),
      description: tHome('actions.start-description'),
      icon: Plus,
      action: () => runAction(onCreateMeeting),
    },
    {
      key: 'schedule-meeting',
      title: tHome('schedule.title'),
      description: tHome('schedule.description'),
      icon: CalendarClock,
      action: openSchedule,
    },
  ].filter((item) => matches([item.title, item.description]));

  if (/^[a-z0-9-]{4,}$/i.test(normalizedQuery)) {
    meetingItems.unshift({
      key: 'join-meeting',
      title: t('command.join', { code: normalizedQuery }),
      description: tHome('join.description'),
      icon: Video,
      meta: normalizedQuery,
      action: () => runAction(onJoin),
    });
  }

  for (const item of (upcoming.data ?? []).slice(0, normalizedQuery ? 8 : 4)) {
    const title =
      item.title ??
      tHome('upcoming.default-title', { date: formatPaletteDate(item.scheduledFor) });

    if (!matches([title, item.code, item.hostName, formatPaletteDate(item.scheduledFor)])) {
      continue;
    }

    meetingItems.push({
      key: `upcoming-${item.id}`,
      title,
      description: `${formatPaletteDate(item.scheduledFor)} · ${item.hostName}`,
      icon: CalendarClock,
      meta: item.code,
      action: () => runAction(() => nav.push(`/${item.code}/lobby`)),
    });
  }

  for (const item of (history.data?.items ?? []).slice(0, normalizedQuery ? 8 : 4)) {
    const title =
      item.title ??
      tHome('recent.default-title', { date: formatPaletteDate(item.startedAt ?? item.createdAt) });

    if (!matches([title, item.code, item.hostName, formatPaletteDate(item.startedAt ?? item.createdAt)])) {
      continue;
    }

    meetingItems.push({
      key: `recent-${item.id}`,
      title,
      description: `${formatPaletteDate(item.startedAt ?? item.createdAt)} · ${item.hostName}`,
      icon: History,
      meta: item.status === MeetingStatus.ACTIVE ? tHome('recent.live-label') : item.code,
      metaTone: item.status === MeetingStatus.ACTIVE ? 'success' : 'default',
      action: () => runAction(() => nav.push(recentMeetingHref(item))),
    });
  }

  const chatItems: ActionItem[] = [
    {
      key: 'new-chat',
      title: tChat('new-chat.title'),
      description: tChat('list.subtitle'),
      icon: SquarePen,
      action: () => runAction(() => nav.push('/chat/new')),
    },
  ].filter((item) => matches([item.title, item.description]));

  for (const conversation of (conversations.data?.items ?? []).slice(0, normalizedQuery ? 8 : 5)) {
    const display = conversationDisplay(conversation, user?.id);
    const preview = conversation.lastMessage
      ? conversation.lastMessage.deletedAt
        ? tChat('bubble.deleted')
        : previewText(conversation.lastMessage.content) || tChat('list.attachment')
      : tChat('list.no-messages');
    const title = display.title || tChat('list.untitled');

    if (!matches([title, conversation.title, conversation.description, preview])) {
      continue;
    }

    chatItems.push({
      key: conversation.id,
      title,
      description: preview,
      visual: display.isGroup ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Users className="h-4 w-4" />
        </span>
      ) : (
        <UserAvatar user={{ name: title, avatar: display.avatar }} size="sm" />
      ),
      meta: conversation.unreadCount > 0 ? `${conversation.unreadCount}` : undefined,
      action: () => runAction(() => nav.push(`/chat/${conversation.id}`)),
    });
  }

  const appearanceItems: ActionItem[] = [
    {
      key: 'toggle-theme',
      title:
        resolvedTheme === 'dark' ? t('command.switch-to-light') : t('command.switch-to-dark'),
      description: tAccount('settings.appearance-description'),
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      action: () =>
        runAction(() => {
          setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        }),
    },
    {
      key: 'system-theme',
      title: t('command.match-system-theme'),
      description: tAccount('settings.appearance-description'),
      icon: Search,
      action: () =>
        runAction(() => {
          setTheme('system');
        }),
    },
  ].filter((item) => matches([item.title, item.description]));

  const accountItems: ActionItem[] = user
    ? [
        {
          key: 'profile',
          title: tAccount('sidebar.profile-label'),
          description: tAccount('sidebar.profile-description'),
          icon: User,
          action: () => runAction(() => nav.push('/profile')),
        },
        {
          key: 'settings',
          title: tAccount('sidebar.settings-label'),
          description: tAccount('sidebar.settings-description'),
          icon: Settings,
          action: () => runAction(() => nav.push('/settings')),
        },
        {
          key: 'sign-out',
          title: t('command.sign-out'),
          description: t('menu.sign-out'),
          icon: LogOut,
          destructive: true,
          disabled: logout.isPending,
          action: () => runAction(() => logout.mutate()),
        },
      ].filter((item) => matches([item.title, item.description]))
    : [];

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);

          if (!next) {
            setQuery('');
          }
        }}
      >
        <DialogContent className="max-w-2xl gap-0 p-0">
          <Command shouldFilter={false} loop className="bg-transparent">
            <DialogHeader className="border-b border-border/60 px-5 py-5 text-left sm:px-6">
              <DialogTitle>{t('search-placeholder')}</DialogTitle>
              <DialogDescription>{t('command.placeholder')}</DialogDescription>
            </DialogHeader>

            <div className="border-b border-border/60 px-5 py-4 sm:px-6">
              <CommandInput
                wrapperClassName="rounded-lg border border-border bg-muted/25 px-3"
                className="h-11"
                placeholder={t('command.placeholder')}
                value={query}
                onValueChange={setQuery}
              />
            </div>

            <CommandList className="max-h-none overflow-visible px-3 py-3 sm:px-4">
              <CommandEmpty className="px-4 py-8">{t('command.no-results')}</CommandEmpty>

              {navigationItems.length > 0 ? (
                <CommandGroup heading={t('rail.label')} className="p-1">
                  {navigationItems.map((item) => (
                    <PaletteItem key={item.key} item={item} />
                  ))}
                </CommandGroup>
              ) : null}

              {navigationItems.length > 0 &&
              (meetingItems.length > 0 ||
                chatItems.length > 0 ||
                appearanceItems.length > 0 ||
                accountItems.length > 0) ? (
                <CommandSeparator className="my-2" />
              ) : null}

              {meetingItems.length > 0 ? (
                <CommandGroup heading={t('command.group-meetings')} className="p-1">
                  {meetingItems.map((item) => (
                    <PaletteItem key={item.key} item={item} />
                  ))}
                </CommandGroup>
              ) : null}

              {meetingItems.length > 0 &&
              (chatItems.length > 0 || appearanceItems.length > 0 || accountItems.length > 0) ? (
                <CommandSeparator className="my-2" />
              ) : null}

              {chatItems.length > 0 ? (
                <CommandGroup heading={tChat('list.title')} className="p-1">
                  {chatItems.map((item) => (
                    <PaletteItem key={item.key} item={item} />
                  ))}
                </CommandGroup>
              ) : null}

              {chatItems.length > 0 && (appearanceItems.length > 0 || accountItems.length > 0) ? (
                <CommandSeparator className="my-2" />
              ) : null}

              {appearanceItems.length > 0 ? (
                <CommandGroup heading={t('command.group-appearance')} className="p-1">
                  {appearanceItems.map((item) => (
                    <PaletteItem key={item.key} item={item} />
                  ))}
                </CommandGroup>
              ) : null}

              {appearanceItems.length > 0 && accountItems.length > 0 ? (
                <CommandSeparator className="my-2" />
              ) : null}

              {accountItems.length > 0 ? (
                <CommandGroup heading={user?.name ?? tAccount('sidebar.heading')} className="p-1">
                  {accountItems.map((item) => (
                    <PaletteItem key={item.key} item={item} />
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <ScheduleMeetingDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </>
  );
}

function PaletteItem({ item }: { item: ActionItem }) {
  return (
    <CommandItem
      value={item.title}
      onSelect={() => item.action()}
      disabled={item.disabled}
      className={cn(
        'rounded-lg px-3 py-2.5 aria-selected:bg-muted/70',
        item.destructive &&
          'text-destructive aria-selected:bg-destructive/10 aria-selected:text-destructive',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {item.visual ?? <PaletteIcon icon={item.icon} destructive={item.destructive} />}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">{item.description}</p>
        </div>
      </div>

      {item.meta ? (
        <CommandShortcut
          className={cn(
            'rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-normal',
            item.metaTone === 'success'
              ? 'border-success/20 bg-success/10 text-success'
              : 'border-border/70 bg-background text-muted-foreground',
          )}
        >
          {item.meta}
        </CommandShortcut>
      ) : null}
    </CommandItem>
  );
}

function PaletteIcon({
  icon: Icon,
  destructive = false,
}: {
  icon?: LucideIcon;
  destructive?: boolean;
}) {
  if (!Icon) {
    return null;
  }

  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
        destructive ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  return values.some((value) => value?.toLowerCase().includes(query));
}

function formatPaletteDate(iso: string | null) {
  if (!iso) {
    return '-';
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function recentMeetingHref(item: MeetingHistoryItemDto) {
  return item.status === MeetingStatus.ACTIVE || item.status === MeetingStatus.WAITING
    ? `/${item.code}/lobby`
    : `/history/${item.code}`;
}
