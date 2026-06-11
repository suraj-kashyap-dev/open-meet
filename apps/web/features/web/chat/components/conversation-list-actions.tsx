'use client';

import { Building2, ChevronRight, MessageSquare, SquarePen, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@open-meet/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@open-meet/ui/dropdown-menu';

import { useCanCreateGroups } from '@/features/web/auth/hooks/use-auth';
import { NewGroupDialog } from '@/features/web/chat/components/new-group-dialog';
import { useCreateMeeting } from '@/features/web/meeting/hooks/use-meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { Link } from '@/i18n/navigation';
import { ApiClientError } from '@/lib/api/client';

export function ConversationListActions() {
  const t = useTranslations('chat');
  const tNav = useTranslations('nav');
  const createMeeting = useCreateMeeting();
  const nav = useNavigateTransition();
  const canCreateGroup = useCanCreateGroups();
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  const startMeeting = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});

      nav.push(`/${meeting.code}/lobby`);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : tNav('command.create-meeting-error'),
      );
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 pt-3">
        <ComposeButton canCreateGroup={canCreateGroup} onOpenGroup={() => setNewGroupOpen(true)} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('list.start-meeting')}
          onClick={startMeeting}
          disabled={createMeeting.isPending}
          className="shrink-0 rounded-2xl border border-border/70 bg-background/60 shadow-sm hover:bg-muted"
        >
          <Video className="h-4 w-4" />
        </Button>
      </div>

      <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} />
    </>
  );
}

function ComposeButton({
  canCreateGroup,
  onOpenGroup,
}: {
  canCreateGroup: boolean;
  onOpenGroup: () => void;
}) {
  const t = useTranslations('chat');

  if (!canCreateGroup) {
    return (
      <Button
        asChild
        variant="ghost"
        className="h-12 flex-1 justify-start rounded-2xl px-4 text-sm font-semibold shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent dark:hover:bg-transparent"
      >
        <Link href="/chat/new">
          <SquarePen className="h-4 w-4" />
          {t('list.compose')}
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-12 flex-1 justify-start rounded-2xl px-4 text-sm font-semibold shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent dark:hover:bg-transparent"
        >
          <SquarePen className="h-4 w-4" />
          {t('list.compose')}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-64 overflow-hidden p-1.5"
      >
        <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
          <Link
            href="/chat/new"
            className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">{t('group.compose-chat')}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
          <button
            type="button"
            onClick={onOpenGroup}
            className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">{t('group.compose-group')}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
            </span>
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
