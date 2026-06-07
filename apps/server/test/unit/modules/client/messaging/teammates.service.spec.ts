import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TeammatesService } from '@/modules/client/messaging/services/teammates.service';
import { type TeammatesRepository } from '@/modules/client/messaging/repositories/teammates.repository';
import { type PresenceService } from '@/modules/client/messaging/services/presence.service';
import { type StorageService } from '@/storage/services/storage.service';

describe('TeammatesService', () => {
  let repo: {
    search: ReturnType<typeof vi.fn>;
    directConversationIds: ReturnType<typeof vi.fn>;
  };
  let presence: { snapshot: ReturnType<typeof vi.fn> };
  let storage: { publicUrl: ReturnType<typeof vi.fn> };
  let service: TeammatesService;

  beforeEach(() => {
    repo = {
      search: vi.fn(),
      directConversationIds: vi.fn().mockResolvedValue(new Map()),
    };
    presence = { snapshot: vi.fn().mockResolvedValue(new Map()) };
    storage = { publicUrl: vi.fn((key: string) => `https://cdn/${key}`) };
    service = new TeammatesService(
      repo as unknown as TeammatesRepository,
      presence as unknown as PresenceService,
      storage as unknown as StorageService,
    );
  });

  describe('search()', () => {
    it('should forward the user id and query to the repository', async () => {
      repo.search.mockResolvedValue([]);

      await service.search('u1', 'bob');

      expect(repo.search).toHaveBeenCalledWith('u1', 'bob');
    });

    it('should resolve avatar urls, presence and direct conversation ids', async () => {
      repo.search.mockResolvedValue([
        {
          id: 'u2',
          name: 'Bob',
          email: 'bob@x.io',
          avatarKey: 'avatars/bob.png',
          chatDisabled: false,
          allowDirectMessages: true,
        },
      ]);
      presence.snapshot.mockResolvedValue(
        new Map([['u2', { online: true, status: 'busy', lastSeen: null }]]),
      );
      repo.directConversationIds.mockResolvedValue(new Map([['u2', 'c9']]));

      const result = await service.search('u1');

      expect(presence.snapshot).toHaveBeenCalledWith(['u2']);
      expect(repo.directConversationIds).toHaveBeenCalledWith('u1', ['u2']);
      expect(result.items).toEqual([
        {
          id: 'u2',
          name: 'Bob',
          email: 'bob@x.io',
          avatar: 'https://cdn/avatars/bob.png',
          chatDisabled: false,
          allowDirectMessages: true,
          online: true,
          status: 'busy',
          lastSeen: null,
          conversationId: 'c9',
        },
      ]);
    });

    it('should default avatar, presence and conversation id when none are available', async () => {
      repo.search.mockResolvedValue([
        {
          id: 'u3',
          name: 'Cara',
          email: 'cara@x.io',
          avatarKey: null,
          chatDisabled: true,
          allowDirectMessages: false,
        },
      ]);

      const result = await service.search('u1');

      expect(storage.publicUrl).not.toHaveBeenCalled();
      expect(result.items[0]).toMatchObject({
        avatar: null,
        online: false,
        status: null,
        lastSeen: null,
        conversationId: null,
      });
    });
  });
});
