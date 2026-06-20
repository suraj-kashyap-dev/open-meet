'use client';

import { useEffect, useState } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartArea,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

interface ChartPalette {
  accent: string;
  background: string;
  border: string;
  card: string;
  foreground: string;
  info: string;
  muted: string;
  success: string;
  warning: string;
}

const FALLBACK_PALETTE: ChartPalette = {
  accent: '#5b5fc7',
  background: '#fafafa',
  border: '#e4e4e7',
  card: '#ffffff',
  foreground: '#09090b',
  info: '#0ea5e9',
  muted: '#71717a',
  success: '#10b981',
  warning: '#f59e0b',
};

function readCssColor(name: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  return value || fallback;
}

function parseRgb(color: string): [number, number, number] | null {
  const normalized = color.trim();

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);

    if (hex.length === 3) {
      const red = hex.charAt(0);
      const green = hex.charAt(1);
      const blue = hex.charAt(2);

      return [
        Number.parseInt(red + red, 16),
        Number.parseInt(green + green, 16),
        Number.parseInt(blue + blue, 16),
      ];
    }

    if (hex.length >= 6) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  const rgbMatch = normalized.match(/\d+(\.\d+)?/g);

  if (!rgbMatch || rgbMatch.length < 3) {
    return null;
  }

  const [red, green, blue] = rgbMatch as [string, string, string, ...string[]];

  return [Number.parseFloat(red), Number.parseFloat(green), Number.parseFloat(blue)];
}

export function withAlpha(color: string, alpha: number): string {
  const rgb = parseRgb(color);

  if (!rgb) {
    return color;
  }

  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function readPalette(): ChartPalette {
  const accent = readCssColor('--accent', FALLBACK_PALETTE.accent);

  return {
    accent,
    background: readCssColor('--background', FALLBACK_PALETTE.background),
    border: readCssColor('--border', FALLBACK_PALETTE.border),
    card: readCssColor('--card', FALLBACK_PALETTE.card),
    foreground: readCssColor('--foreground', FALLBACK_PALETTE.foreground),
    info: '#38bdf8',
    muted: readCssColor('--muted-foreground', FALLBACK_PALETTE.muted),
    success: readCssColor('--success', FALLBACK_PALETTE.success),
    warning: readCssColor('--warning', FALLBACK_PALETTE.warning),
  };
}

export function useChartPalette(): ChartPalette {
  const [palette, setPalette] = useState<ChartPalette>(FALLBACK_PALETTE);

  useEffect(() => {
    const syncPalette = () => {
      setPalette(readPalette());
    };

    syncPalette();

    const observer = new MutationObserver(syncPalette);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return palette;
}

export function createVerticalGradient(
  ctx: CanvasRenderingContext2D,
  area: ChartArea,
  topColor: string,
  bottomColor: string,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);

  gradient.addColorStop(0, topColor);

  gradient.addColorStop(1, bottomColor);

  return gradient;
}
