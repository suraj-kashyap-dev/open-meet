/**
 * Mirror of `apps/web/components/web/theme/accent-palette.ts`. Kept in-app
 * (rather than a shared package) so the admin can ship without depending on
 * web's component graph. Source of truth values must stay in sync.
 */
export const ACCENT_PRESETS = [
  'indigo',
  'blue',
  'green',
  'purple',
  'rose',
  'amber',
  'teal',
] as const;

export type AccentPreset = (typeof ACCENT_PRESETS)[number];

export interface AccentTokens {
  accent: string;
  accentForeground: string;
  ring: string;
  heroGlow: string;
}

type Mode = 'light' | 'dark';

export const ACCENT_PALETTE: Record<AccentPreset, Record<Mode, AccentTokens>> = {
  indigo: {
    light: {
      accent: '#5b5fc7',
      accentForeground: '#ffffff',
      ring: '#5b5fc7',
      heroGlow: 'rgba(91, 95, 199, 0.18)',
    },
    dark: {
      accent: '#7f85f5',
      accentForeground: '#ffffff',
      ring: '#7f85f5',
      heroGlow: 'rgba(127, 133, 245, 0.35)',
    },
  },
  blue: {
    light: {
      accent: '#2563eb',
      accentForeground: '#ffffff',
      ring: '#2563eb',
      heroGlow: 'rgba(37, 99, 235, 0.18)',
    },
    dark: {
      accent: '#60a5fa',
      accentForeground: '#0a0a0a',
      ring: '#60a5fa',
      heroGlow: 'rgba(96, 165, 250, 0.35)',
    },
  },
  green: {
    light: {
      accent: '#16a34a',
      accentForeground: '#ffffff',
      ring: '#16a34a',
      heroGlow: 'rgba(22, 163, 74, 0.18)',
    },
    dark: {
      accent: '#4ade80',
      accentForeground: '#0a0a0a',
      ring: '#4ade80',
      heroGlow: 'rgba(74, 222, 128, 0.35)',
    },
  },
  purple: {
    light: {
      accent: '#9333ea',
      accentForeground: '#ffffff',
      ring: '#9333ea',
      heroGlow: 'rgba(147, 51, 234, 0.18)',
    },
    dark: {
      accent: '#c084fc',
      accentForeground: '#0a0a0a',
      ring: '#c084fc',
      heroGlow: 'rgba(192, 132, 252, 0.35)',
    },
  },
  rose: {
    light: {
      accent: '#e11d48',
      accentForeground: '#ffffff',
      ring: '#e11d48',
      heroGlow: 'rgba(225, 29, 72, 0.18)',
    },
    dark: {
      accent: '#fb7185',
      accentForeground: '#0a0a0a',
      ring: '#fb7185',
      heroGlow: 'rgba(251, 113, 133, 0.35)',
    },
  },
  amber: {
    light: {
      accent: '#d97706',
      accentForeground: '#ffffff',
      ring: '#d97706',
      heroGlow: 'rgba(217, 119, 6, 0.18)',
    },
    dark: {
      accent: '#fbbf24',
      accentForeground: '#0a0a0a',
      ring: '#fbbf24',
      heroGlow: 'rgba(251, 191, 36, 0.35)',
    },
  },
  teal: {
    light: {
      accent: '#0d9488',
      accentForeground: '#ffffff',
      ring: '#0d9488',
      heroGlow: 'rgba(13, 148, 136, 0.18)',
    },
    dark: {
      accent: '#2dd4bf',
      accentForeground: '#0a0a0a',
      ring: '#2dd4bf',
      heroGlow: 'rgba(45, 212, 191, 0.35)',
    },
  },
};

export function isAccentPreset(value: string): value is AccentPreset {
  return (ACCENT_PRESETS as readonly string[]).includes(value);
}

const HEX_RE = /^#([0-9a-f]{6})$/i;
export function isAccentHex(value: string): boolean {
  return HEX_RE.test(value);
}
