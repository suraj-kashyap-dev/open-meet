'use client';

import { useCallback } from 'react';

import { useUserSettings } from '@/features/web/account/hooks/use-settings';
import { playSound, type SoundName } from '@/lib/sounds';

/**
 * Returns a `play()` function for a single sound. Gated by the user's
 * `enableJoinSound` preference (the setting now governs all meeting sounds —
 * its label was widened in the settings UI to reflect that).
 */
export function useSound(name: SoundName): { play: () => void } {
  const { data: settings } = useUserSettings();
  const enabled = settings?.meetingPreferences?.enableJoinSound ?? true;

  const play = useCallback(() => {
    if (!enabled) {
      return;
    }
    void playSound(name);
  }, [enabled, name]);

  return { play };
}
