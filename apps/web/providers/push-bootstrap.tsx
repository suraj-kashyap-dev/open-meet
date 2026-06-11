'use client';

import { useEffect } from 'react';

import { useCurrentUser } from '@/features/web/auth/hooks/use-auth';
import { useUserSettings } from '@/features/web/account/hooks/use-settings';
import { pushSupported, registerServiceWorker, subscribeToPush } from '@/lib/push';

export function PushBootstrap() {
  const { data: user } = useCurrentUser();
  const { data: settings } = useUserSettings(Boolean(user));

  const enabled = settings?.meetingPreferences?.enableNotifications ?? false;

  useEffect(() => {
    if (!user || !enabled || !pushSupported()) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await registerServiceWorker();

        if (!cancelled) {
          await subscribeToPush();
        }
      } catch {
        // best-effort; the user can re-toggle from settings
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, enabled]);

  return null;
}
