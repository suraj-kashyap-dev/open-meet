export interface PushSubscriptionKeysDto {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionDto {
  endpoint: string;
  keys: PushSubscriptionKeysDto;
}

export interface VapidPublicKeyDto {
  publicKey: string;
}

export type PushNotificationKind = 'chat' | 'knock';

export interface PushPayloadDto {
  kind: PushNotificationKind;
  title: string;
  body: string;
  url: string;
  tag?: string;
  conversationId?: string;
  meetingCode?: string;
}
