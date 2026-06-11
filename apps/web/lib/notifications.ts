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
  onClick?: () => void;
}

export function notify(title: string, opts: NotifyOptions = {}): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') {
    return;
  }

  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return;
  }

  try {
    const notification = new Notification(title, {
      body: opts.body,
      icon: opts.icon ?? '/icon.svg',
      tag: opts.tag,
      silent: opts.silent,
    });

    notification.onclick = (event) => {
      event.preventDefault();

      window.focus();

      opts.onClick?.();

      notification.close();
    };
  } catch {}
}
