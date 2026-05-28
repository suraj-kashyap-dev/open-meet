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
    <div className="min-h-full bg-card">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20">
          <Users className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight">{t('teams.title')}</h1>
          <p className="truncate text-xs text-muted-foreground">{t('teams.subtitle')}</p>
        </div>
        {teams.length > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {teams.length}
          </span>
        ) : null}
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('list.loading')}</p>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">{t('teams.empty-title')}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {t('teams.empty-subtitle')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <section key={team.teamId} className="rounded-xl border border-border bg-card">
                <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="flex-1 text-sm font-semibold tracking-tight">{team.teamName}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {team.channels.length}
                  </span>
                </header>
                {team.channels.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-muted-foreground">
                    {t('teams.no-channels')}
                  </p>
                ) : (
                  <ul className="py-1">
                    {team.channels.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/chat/${c.id}`}
                          className="flex items-center gap-2.5 px-4 py-2 transition-colors hover:bg-muted/40"
                        >
                          <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm">{c.title}</span>
                          {c.unreadCount > 0 ? (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                              {c.unreadCount > 99 ? '99+' : c.unreadCount}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
