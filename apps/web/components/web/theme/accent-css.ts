import { ACCENT_PALETTE, isAccentHex, isAccentPreset } from './accent-palette';
import type { AccentTokens } from './accent-palette';
import { deriveAccent } from './derive-accent';

/**
 * Resolve the four accent CSS-variable values for a given accent choice + mode.
 * Server-safe (no React, no browser APIs) so it can run during SSR and inside
 * the client AccentProvider from a single source of truth.
 */
export function resolveAccentTokens(value: string, mode: 'light' | 'dark'): AccentTokens {
  if (isAccentPreset(value)) {
    return ACCENT_PALETTE[value][mode];
  }
  if (isAccentHex(value)) {
    return deriveAccent(value, mode);
  }
  return ACCENT_PALETTE.indigo[mode];
}

function declarations(tokens: AccentTokens): string {
  return [
    `--accent:${tokens.accent}`,
    `--accent-foreground:${tokens.accentForeground}`,
    `--ring:${tokens.ring}`,
    `--hero-glow:${tokens.heroGlow}`,
  ].join(';');
}

/**
 * Build a CSS string that pins the accent variables for both light (`:root`) and
 * dark (`.dark`) modes. Injected server-side so the first paint already uses the
 * workspace branding accent — no flash from the indigo defaults baked into the
 * shared stylesheet before the client effect runs.
 */
export function buildAccentCss(value: string): string {
  const light = declarations(resolveAccentTokens(value, 'light'));
  const dark = declarations(resolveAccentTokens(value, 'dark'));
  return `:root{${light}}.dark{${dark}}`;
}
