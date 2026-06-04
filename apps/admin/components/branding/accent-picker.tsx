'use client';

import { Check, Palette } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { cn } from '@open-meet/ui/cn';

import { ACCENT_PALETTE, ACCENT_PRESETS, isAccentHex, isAccentPreset } from './accent-palette';

export function AccentPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('branding');
  const isPreset = isAccentPreset(value);
  const customHex = !isPreset && isAccentHex(value) ? value : '';
  const [showAdvanced, setShowAdvanced] = useState(Boolean(customHex));
  const [hexDraft, setHexDraft] = useState(customHex || '#5b5fc7');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ACCENT_PRESETS.map((preset) => {
          const tokens = ACCENT_PALETTE[preset].light;
          const selected = isPreset && value === preset;
          return (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset)}
              aria-pressed={selected}
              aria-label={t(`accent.preset.${preset}`)}
              title={t(`accent.preset.${preset}`)}
              className={cn(
                'group relative h-9 w-9 rounded-full ring-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-offset-2 disabled:opacity-50 disabled:hover:scale-100',
                selected
                  ? 'ring-foreground ring-offset-2 ring-offset-background'
                  : 'ring-transparent',
              )}
              style={{ background: tokens.accent }}
            >
              {selected ? (
                <Check
                  className="absolute inset-0 m-auto h-4 w-4"
                  style={{ color: tokens.accentForeground }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Palette className="h-3.5 w-3.5" />
        {t('accent.advanced')}
      </button>

      {showAdvanced ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            aria-label={t('accent.hex-picker')}
            disabled={disabled}
            className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent disabled:opacity-50"
          />
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            placeholder="#RRGGBB"
            aria-label={t('accent.hex-input')}
            disabled={disabled}
            className="h-9 w-28 rounded-md border border-border bg-card px-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => {
              if (isAccentHex(hexDraft)) onChange(hexDraft);
            }}
            disabled={disabled || !isAccentHex(hexDraft) || hexDraft === value}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            {t('accent.apply-hex')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
