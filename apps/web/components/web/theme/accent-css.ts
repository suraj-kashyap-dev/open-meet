import { ACCENT_PALETTE, isAccentHex, isAccentPreset } from './accent-palette';
import type { AccentTokens } from './accent-palette';
import { deriveAccent } from './derive-accent';

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

export function buildAccentCss(value: string): string {
  const light = declarations(resolveAccentTokens(value, 'light'));
  const dark = declarations(resolveAccentTokens(value, 'dark'));
  return `:root{${light}}.dark{${dark}}`;
}
