import { Injectable } from '@nestjs/common';

import type { TeammateListDto } from '@open-meet/types';

import { StorageService } from '../../../storage/storage.service';

import { PresenceService } from './presence.service';
import { TeammatesRepository } from './teammates.repository';

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
    const [online, directIds] = await Promise.all([
      this.presence.areOnline(ids),
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
        online: online.has(r.id),
        conversationId: directIds.get(r.id) ?? null,
      })),
    };
  }
}
