'use client';

import {
  LogOut,
  Moon,
  Plus,
  Search,
  Sun,
  User,
  Video,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/command';
import { useCurrentUser, useLogout } from '@/hooks/client/use-auth';
import { useCreateMeeting } from '@/hooks/client/use-meetings';
import { ApiClientError } from '@/lib/shared/api';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { setTheme, resolvedTheme } = useTheme();
  const createMeeting = useCreateMeeting();
  const logout = useLogout();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => ! v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const runAction = (fn: () => void | Promise<void>) => {
    setOpen(false);
    void fn();
  };

  const onCreateMeeting = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({});
      router.push(`/meeting/${meeting.code}/lobby`);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Could not create meeting';
      toast.error(message);
    }
  };

  const onJoin = () => {
    const trimmed = code.trim().toLowerCase();
    if (! trimmed) {
      toast.error('Type a meeting code first');
      return;
    }
    router.push(`/meeting/${trimmed}/lobby`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or meeting code…"
        value={code}
        onValueChange={setCode}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Meetings">
          <CommandItem onSelect={() => runAction(onCreateMeeting)}>
            <Plus className="h-4 w-4" />
            New meeting
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          {code.trim().length > 0 ? (
            <CommandItem onSelect={() => runAction(onJoin)}>
              <Video className="h-4 w-4" />
              Join &ldquo;{code.trim()}&rdquo;
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
          ) : null}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Appearance">
          <CommandItem
            onSelect={() =>
              runAction(() => {
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
              })
            }
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runAction(() => {
                setTheme('system');
              })
            }
          >
            <Search className="h-4 w-4" />
            Match system theme
          </CommandItem>
        </CommandGroup>

        {user ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={user.name}>
              <CommandItem onSelect={() => runAction(() => router.push('/dashboard'))}>
                <User className="h-4 w-4" />
                Dashboard
              </CommandItem>
              <CommandItem
                onSelect={() => runAction(() => logout.mutate())}
                className="text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
