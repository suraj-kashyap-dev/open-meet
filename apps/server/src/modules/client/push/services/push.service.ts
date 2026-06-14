import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';

import type { ApiEnv } from '@open-meet/config';
import type { PushPayloadDto } from '@open-meet/types';

import { PushRepository } from '@/modules/client/push/repositories/push.repository';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly repository: PushRepository,
    config: ConfigService<ApiEnv, true>,
  ) {
    const publicKey = config.get('VAPID_PUBLIC_KEY', { infer: true });
    const privateKey = config.get('VAPID_PRIVATE_KEY', { infer: true });
    const subject = config.get('VAPID_SUBJECT', { infer: true });

    this.enabled = Boolean(publicKey && privateKey);

    if (this.enabled) {
      webpush.setVapidDetails(subject ?? 'mailto:admin@open-meet.local', publicKey!, privateKey!);
    } else {
      this.logger.warn('VAPID keys not configured - web push notifications are disabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async subscribe(input: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }): Promise<void> {
    await this.repository.upsert(input);
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.repository.deleteByEndpoint(userId, endpoint);
  }

  async sendToUser(userId: string, payload: PushPayloadDto): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const subscriptions = await this.repository.findManyByUserId(userId);

    if (subscriptions.length === 0) {
      return;
    }

    const body = JSON.stringify(payload);
    const expired: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;

          if (statusCode === 404 || statusCode === 410) {
            expired.push(sub.endpoint);
          } else {
            this.logger.warn(`web push failed for ${sub.endpoint}: ${String(error)}`);
          }
        }
      }),
    );

    if (expired.length > 0) {
      await this.repository.deleteByEndpoints(expired);
    }
  }
}
