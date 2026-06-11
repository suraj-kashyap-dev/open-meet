import type { AccentTokens } from './accent-palette';

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);

  if (!m) {
    return [0, 0, 0];
  }

  return [parseInt(m[1] ?? '0', 16), parseInt(m[2] ?? '0', 16), parseInt(m[3] ?? '0', 16)];
}

function luminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const v = c / 255;

    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(...a);
  const lb = luminance(...b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];

  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: [number, number, number] = [255, 255, 255];
const NEAR_BLACK: [number, number, number] = [10, 10, 10];

export function deriveAccent(hex: string, mode: 'light' | 'dark'): AccentTokens {
  const rgb = hexToRgb(hex);
  const fg = contrast(rgb, WHITE) >= contrast(rgb, NEAR_BLACK) ? '#ffffff' : '#0a0a0a';
  const [r, g, b] = rgb;
  const alpha = mode === 'light' ? 0.18 : 0.35;

  return {
    accent: hex,
    accentForeground: fg,
    ring: hex,
    heroGlow: `rgba(${r}, ${g}, ${b}, ${alpha})`,
  };
}
