import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

import type { ApiEnv } from '@open-meet/config';
import type { PushPayloadDto } from '@open-meet/types';

import { SettingsRepository } from '../settings/settings.repository';
import { ChatBus, userRoom } from '../messaging/chat-bus.service';
import { ConversationsService } from '../messaging/conversations.service';
import { PushRepository } from './push.repository';
import { PushService } from './push.service';

export interface ChatMessageJob {
  conversationId: string;
  senderId: string;
  senderName: string;
}

export interface KnockJob {
  hostUserId: string;
  knockerName: string;
  meetingCode: string;
}

@Injectable()
export class PushDispatchService {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly settings: SettingsRepository,
    private readonly pushRepo: PushRepository,
    private readonly push: PushService,
    private readonly bus: ChatBus,
    private readonly i18n: I18nService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {}

  private frontendUrl(): string {
    return this.config.get('FRONTEND_URL', { infer: true }) ?? 'http://localhost:3000';
  }

  private t(key: string, lang: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(`notifications.${key}`, { lang, args });
  }

  async dispatchChatMessage(job: ChatMessageJob): Promise<void> {
    if (!this.push.isEnabled()) {
      return;
    }

    const members = await this.conversations.membersWithMuteState(job.conversationId);
    const candidates = members
      .filter((m) => m.userId !== job.senderId && !m.muted)
      .map((m) => m.userId);
    if (candidates.length === 0) {
      return;
    }

    const disabled = await this.settings.disabledNotificationUserIds(candidates);
    const recipients = candidates.filter((id) => !disabled.has(id));
    if (recipients.length === 0) {
      return;
    }

    const languages = await this.pushRepo.userLanguages(recipients);
    const base = this.frontendUrl();
    const senderName = job.senderName || 'Someone';

    await Promise.all(
      recipients.map(async (userId) => {
        // roomHasSockets reflects live /chat connections across instances via the
        // socket.io Redis adapter; a falsy result means the recipient is offline.
        if (await this.bus.roomHasSockets(userRoom(userId))) {
          return;
        }
        const lang = languages.get(userId) ?? 'en';
        const payload: PushPayloadDto = {
          kind: 'chat',
          title: this.t('chat-message-title', lang),
          body: this.t('chat-message-body', lang, { name: senderName }),
          url: `${base}/${lang}/chat/${job.conversationId}`,
          tag: `chat:${job.conversationId}`,
          conversationId: job.conversationId,
        };
        await this.push.sendToUser(userId, payload);
      }),
    );
  }

  async dispatchKnock(job: KnockJob): Promise<void> {
    if (!this.push.isEnabled()) {
      return;
    }

    if (await this.bus.roomHasSockets(userRoom(job.hostUserId))) {
      return;
    }

    const disabled = await this.settings.disabledNotificationUserIds([job.hostUserId]);
    if (disabled.has(job.hostUserId)) {
      return;
    }

    const languages = await this.pushRepo.userLanguages([job.hostUserId]);
    const lang = languages.get(job.hostUserId) ?? 'en';
    const base = this.frontendUrl();

    const payload: PushPayloadDto = {
      kind: 'knock',
      title: this.t('knock-title', lang),
      body: this.t('knock-body', lang, { name: job.knockerName || 'Someone' }),
      url: `${base}/${lang}/${job.meetingCode}`,
      tag: `knock:${job.meetingCode}`,
      meetingCode: job.meetingCode,
    };
    await this.push.sendToUser(job.hostUserId, payload);
  }
}
