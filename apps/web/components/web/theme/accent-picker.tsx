'use client';

import { Check, Palette } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { cn } from '@open-meet/ui/cn';

import { ACCENT_PALETTE, ACCENT_PRESETS, isAccentHex, isAccentPreset } from './accent-palette';

export function AccentPicker({
  value,
  workspaceDefault,
  onChange,
  onReset,
}: {
  value: string | null;
  workspaceDefault: string;
  onChange: (value: string) => void;
  onReset?: () => void;
}) {
  const t = useTranslations('account');
  const effective = value ?? workspaceDefault;
  const isPreset = isAccentPreset(effective);
  const customHex = !isPreset && isAccentHex(effective) ? effective : '';
  const [showAdvanced, setShowAdvanced] = useState(Boolean(customHex));
  const [hexDraft, setHexDraft] = useState(customHex || '#5b5fc7');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ACCENT_PRESETS.map((preset) => {
          const tokens = ACCENT_PALETTE[preset].light;
          const selected = isPreset && effective === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-pressed={selected}
              aria-label={t(`appearance.preset.${preset}`)}
              title={t(`appearance.preset.${preset}`)}
              className={cn(
                'group relative h-9 w-9 rounded-full ring-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-offset-2',
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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <Palette className="h-3.5 w-3.5" />
        {t('appearance.advanced')}
      </button>

      {showAdvanced ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="color"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            aria-label={t('appearance.hex-picker')}
            className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
          />
          <input
            type="text"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            placeholder="#RRGGBB"
            aria-label={t('appearance.hex-input')}
            className="h-9 w-28 rounded-md border border-border bg-card px-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => {
              if (isAccentHex(hexDraft)) onChange(hexDraft);
            }}
            disabled={!isAccentHex(hexDraft) || hexDraft === effective}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            {t('appearance.apply-hex')}
          </button>
        </div>
      ) : null}

      {value && onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {t('appearance.reset')}
        </button>
      ) : null}
    </div>
  );
}
