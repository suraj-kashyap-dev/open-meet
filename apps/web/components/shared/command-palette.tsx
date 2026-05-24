'use client';

import { LogOut, Moon, Plus, Search, Sun, User, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@open-meet/ui/command';
import { useCurrentUser, useLogout } from '@/features/web/auth/hooks/use-auth';
import { useCreateMeeting } from '@/features/web/meeting/hooks/use-meetings';
import { useNavigateTransition } from '@/hooks/use-navigate-transition';
import { ApiClientError } from '@/lib/api/client';

export function CommandPalette() {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const nav = useNavigateTransition();
  const { data: user } = useCurrentUser();
  const { setTheme, resolvedTheme } = useTheme();
  const createMeeting = useCreateMeeting();
  const logout = useLogout();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) {
        return;
      }

      if (e.altKey || e.shiftKey) {
        return;
      }

      if (!(e.metaKey || e.ctrlKey)) {
        return;
      }

      if (e.code !== 'KeyK') {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setOpen((v) => !v);
    };

    window.addEventListener('keydown', onKey, { capture: true });

    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, []);

  const runAction = (fn: () => void | Promise<void>) => {
    setOpen(false);
    void fn();
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
    const trimmed = code.trim().toLowerCase();

    if (!trimmed) {
      toast.error(t('command.join-code-required'));
      return;
    }

    nav.push(`/${trimmed}/lobby`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('command.placeholder')} value={code} onValueChange={setCode} />
      <CommandList>
        <CommandEmpty>{t('command.no-results')}</CommandEmpty>

        <CommandGroup heading={t('command.group-meetings')}>
          <CommandItem onSelect={() => runAction(onCreateMeeting)}>
            <Plus className="h-4 w-4" />
            {t('command.new-meeting')}
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>

          {code.trim().length > 0 ? (
            <CommandItem onSelect={() => runAction(onJoin)}>
              <Video className="h-4 w-4" />
              {t('command.join', { code: code.trim() })}
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
          ) : null}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('command.group-appearance')}>
          <CommandItem
            onSelect={() =>
              runAction(() => {
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
              })
            }
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {resolvedTheme === 'dark' ? t('command.switch-to-light') : t('command.switch-to-dark')}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAction(() => {
                setTheme('system');
              })
            }
          >
            <Search className="h-4 w-4" />
            {t('command.match-system-theme')}
          </CommandItem>
        </CommandGroup>

        {user ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={user.name}>
              <CommandItem onSelect={() => runAction(() => nav.push('/'))}>
                <User className="h-4 w-4" />
                {t('command.home')}
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(() => logout.mutate())}
                className="text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {t('command.sign-out')}
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
