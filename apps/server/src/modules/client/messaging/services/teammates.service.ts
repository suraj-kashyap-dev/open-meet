import { Injectable } from '@nestjs/common';

import type { TeammateListDto } from '@open-meet/types';

import { StorageService } from '../../../../storage/services/storage.service';

import { PresenceService } from './presence.service';
import { TeammatesRepository } from '../repositories/teammates.repository';

@Injectable()
export class TeammatesService {
  constructor(
    private readonly repo: TeammatesRepository,
    private readonly presence: PresenceService,
    private readonly storage: StorageService,
  ) {}

  async search(userId: string, query?: string): Promise<TeammateListDto> {
    const rows = await this.repo.search(userId, query);
    const ids = rows.map((r) => r.id);
    const [presence, directIds] = await Promise.all([
      this.presence.snapshot(ids),
      this.repo.directConversationIds(userId, ids),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        avatar: r.avatarKey ? this.storage.publicUrl(r.avatarKey) : null,
        chatDisabled: r.chatDisabled,
        allowDirectMessages: r.allowDirectMessages,
        online: presence.get(r.id)?.online ?? false,
        status: presence.get(r.id)?.status ?? null,
        lastSeen: presence.get(r.id)?.lastSeen ?? null,
        conversationId: directIds.get(r.id) ?? null,
      })),
    };
  }
}
