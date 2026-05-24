'use client';

import { useCallback } from 'react';

import { useUserSettings } from '@/features/web/account/hooks/use-settings';
import { notify } from '@/lib/notifications';

interface NotifyOptions {
  body?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

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
