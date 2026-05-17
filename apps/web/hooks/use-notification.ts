'use client';

import { useCallback } from 'react';

import { useUserSettings } from '@/features/account/hooks/use-settings';
import { notify } from '@/lib/notifications';

interface NotifyOptions {
  body?: string;
  icon?: string;
  tag?: string;
}

/**
 * Returns a `notify()` function gated by the user's `enableNotifications`
 * preference. The underlying helper already suppresses notifications when
 * the tab is visible — this just adds the user-toggle layer on top.
 */
export function useNotification(): { notify: (title: string, opts?: NotifyOptions) => void } {
  const { data: settings } = useUserSettings();
  const enabled = settings?.meetingPreferences?.enableNotifications ?? false;

  const fire = useCallback(
    (title: string, opts?: NotifyOptions) => {
      if (!enabled) {
        return;
      }
      notify(title, opts);
    },
    [enabled],
  );

  return { notify: fire };
}
