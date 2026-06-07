export const PUSH_QUEUE = 'push';

export const PushJob = {
  CHAT_MESSAGE: 'chat-message',
  KNOCK: 'knock',
} as const;

export type PushJob = (typeof PushJob)[keyof typeof PushJob];
