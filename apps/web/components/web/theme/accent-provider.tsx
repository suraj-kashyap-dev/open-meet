'use client';

import { useTheme } from 'next-themes';
import { useEffect, type ReactNode } from 'react';

import { useBranding } from '@/components/web/branding/branding-provider';
import { useUserSettings } from '@/features/web/account/hooks/use-settings';

import { ACCENT_PALETTE, isAccentHex, isAccentPreset } from './accent-palette';
import type { AccentTokens } from './accent-palette';
import { deriveAccent } from './derive-accent';

function resolveTokens(value: string, mode: 'light' | 'dark'): AccentTokens {
  if (isAccentPreset(value)) {
    return ACCENT_PALETTE[value][mode];
  }
  if (isAccentHex(value)) {
    return deriveAccent(value, mode);
  }
  return ACCENT_PALETTE.indigo[mode];
}

/**
 * Injects the live accent token set onto `:root` as CSS variables. Order of
 * precedence: user override (UserSettings.accentColorOverride) → workspace
 * default (PublicConfigDto.accentColor) → "indigo" fallback. Mode follows
 * next-themes' resolvedTheme.
 *
 * Must live inside ThemeProvider so `resolvedTheme` is known.
 */
export function AccentProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'light' ? 'light' : 'dark';
  const branding = useBranding();
  const settings = useUserSettings();

  const workspaceAccent = branding.accentColor ?? 'indigo';
  const userOverride = settings.data?.appearance?.accentColorOverride ?? null;
  const choice = userOverride ?? workspaceAccent;

  useEffect(() => {
    const tokens = resolveTokens(choice, mode);
    const r = document.documentElement.style;
    r.setProperty('--accent', tokens.accent);
    r.setProperty('--accent-foreground', tokens.accentForeground);
    r.setProperty('--ring', tokens.ring);
    r.setProperty('--hero-glow', tokens.heroGlow);
  }, [choice, mode]);

  return <>{children}</>;
}
