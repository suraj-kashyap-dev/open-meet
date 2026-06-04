'use client';

import { useTheme } from 'next-themes';
import { useEffect, type ReactNode } from 'react';

import { useBranding } from './provider';
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

export function AccentProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'light' ? 'light' : 'dark';
  const branding = useBranding();
  const choice = branding.accentColor ?? 'indigo';

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
