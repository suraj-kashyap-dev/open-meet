/**
 * Thin wrapper around the browser Notification API. Centralises permission
 * handling so consumers can just call `notify(...)` and let the helper bail
 * silently when permission was never granted (or the user has the tab in
 * focus, in which case we don't want to double-up on in-app feedback).
 */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationsPermission(): NotificationPermission {
  if (!notificationsSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) {
    return 'denied';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

interface NotifyOptions {
  body?: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
}

export function notify(title: string, opts: NotifyOptions = {}): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') {
    return;
  }

  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return;
  }

  try {
    new Notification(title, {
      body: opts.body,
      icon: opts.icon ?? '/icon.svg',
      tag: opts.tag,
      silent: opts.silent,
    });
  } catch {
    /* swallowed: Notification can throw in private mode or with bad icons */
  }
}
