'use client';

import { Hash, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import { useMyTeams } from '../hooks/use-chat';

export function TeamsView() {
  const t = useTranslations('chat');
  const { data, isLoading } = useMyTeams();
  const teams = data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{t('teams.title')}</h1>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('list.loading')}</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('teams.empty')}</p>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <section key={team.teamId}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" />
                {team.teamName}
              </h2>
              <ul className="space-y-0.5">
                {team.channels.length === 0 ? (
                  <li className="px-2 py-1 text-xs text-muted-foreground">{t('teams.no-channels')}</li>
                ) : (
                  team.channels.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/chat/${c.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                      >
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate text-sm">{c.title}</span>
                        {c.unreadCount > 0 ? (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
