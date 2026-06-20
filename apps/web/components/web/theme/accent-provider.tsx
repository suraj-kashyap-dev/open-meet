'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';

import { useBranding } from '@/components/web/branding/branding-provider';
import { useUserSettings } from '@/features/web/account/hooks/use-settings';

import { readCachedAccentChoice, writeCachedAccentChoice } from './accent-cache';
import { resolveAccentTokens } from './accent-css';

export function AccentProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'light' ? 'light' : 'dark';
  const branding = useBranding();
  const settings = useUserSettings();
  const [cachedChoice] = useState(() => readCachedAccentChoice());

  const workspaceAccent = branding.accentColor ?? 'indigo';
  const userOverride = settings.data?.appearance?.accentColorOverride ?? null;
  const choice = settings.isSuccess
    ? (userOverride ?? workspaceAccent)
    : (cachedChoice ?? workspaceAccent);

  useEffect(() => {
    const tokens = resolveAccentTokens(choice, mode);
    const r = document.documentElement.style;

    r.setProperty('--accent', tokens.accent);

    r.setProperty('--accent-foreground', tokens.accentForeground);

    r.setProperty('--ring', tokens.ring);

    r.setProperty('--hero-glow', tokens.heroGlow);

    writeCachedAccentChoice(choice);
  }, [choice, mode]);

  return <>{children}</>;
}
