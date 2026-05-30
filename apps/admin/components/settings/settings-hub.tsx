'use client';

import {
  KeyRound,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AdminPermissionKey } from '@open-meet/types';
import { cn } from '@open-meet/ui/cn';

import { useCurrentAdminMe } from '@/features/auth/hooks/use-admin-auth';
import { Link } from '@/i18n/navigation';

interface SettingsCard {
  href: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  permission?: AdminPermissionKey;
}

interface SettingsSection {
  id: string;
  titleKey: string;
  descriptionKey: string;
  cards: SettingsCard[];
}

const sections: SettingsSection[] = [
  {
    id: 'access',
    titleKey: 'hub.sections.access.title',
    descriptionKey: 'hub.sections.access.description',
    cards: [
      {
        href: '/administrators',
        icon: ShieldCheck,
        titleKey: 'hub.cards.administrators.title',
        descriptionKey: 'hub.cards.administrators.description',
        permission: 'admin-accounts.view',
      },
      {
        href: '/roles',
        icon: KeyRound,
        titleKey: 'hub.cards.roles.title',
        descriptionKey: 'hub.cards.roles.description',
        permission: 'roles.view',
      },
    ],
  },
  {
    id: 'workspace',
    titleKey: 'hub.sections.workspace.title',
    descriptionKey: 'hub.sections.workspace.description',
    cards: [
      {
        href: '/settings/branding',
        icon: Palette,
        titleKey: 'hub.cards.branding.title',
        descriptionKey: 'hub.cards.branding.description',
        permission: 'branding.view',
      },
      {
        href: '/settings/configuration',
        icon: SlidersHorizontal,
        titleKey: 'hub.cards.configuration.title',
        descriptionKey: 'hub.cards.configuration.description',
        permission: 'configuration.view',
      },
    ],
  },
];

export function SettingsHub() {
  const t = useTranslations('configuration');
  const tNav = useTranslations('nav');
  const { data: me } = useCurrentAdminMe();

  const bypass = me?.role?.permissionType === 'ALL';
  const granted = me?.grantedSet ?? [];
  const can = (key: AdminPermissionKey | undefined) => !key || bypass || granted.includes(key);

  const visibleSections = sections
    .map((section) => ({ ...section, cards: section.cards.filter((c) => can(c.permission)) }))
    .filter((section) => section.cards.length > 0);

  return (
    <div className="space-y-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {tNav('items.dashboard')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {tNav('items.settings')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>

      {visibleSections.map((section) => (
        <section key={section.id} className="space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight">{t(section.titleKey)}</h2>
            <p className="text-sm text-muted-foreground">{t(section.descriptionKey)}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3 lg:divide-x">
              {section.cards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className={cn(
                      'group flex items-start gap-4 p-5 outline-none transition-colors',
                      'hover:bg-muted/40 focus-visible:bg-muted/60',
                      'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-accent/15 group-hover:text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block truncate text-sm font-semibold tracking-tight">
                        {t(card.titleKey)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t(card.descriptionKey)}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      {visibleSections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('hub.empty')}</p>
      ) : null}
    </div>
  );
}
