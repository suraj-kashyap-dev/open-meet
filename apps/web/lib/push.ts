import type { PushSubscriptionDto, VapidPublicKeyDto } from '@open-meet/types';

import { api } from '@/lib/api/client';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) {
    return null;
  }

  return navigator.serviceWorker.register('/sw.js');
}

export async function subscribeToPush(): Promise<boolean> {
  if (!pushSupported()) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const { publicKey } = await api.get<VapidPublicKeyDto>('/push/vapid-public-key');

  if (!publicKey) {
    return false;
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  const body: PushSubscriptionDto = {
    endpoint: json.endpoint ?? subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
  };

  await api.post<void>('/push/subscribe', body);

  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!pushSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const endpoint = subscription.endpoint;

  await subscription.unsubscribe().catch(() => undefined);

  await api.post<void>('/push/unsubscribe', { endpoint });
}
