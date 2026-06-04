import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminGroupsService } from '@/modules/admin/groups/groups.service';
import type { AdminGroupsRepository } from '@/modules/admin/groups/groups.repository';
import type { ChatPermissionsService } from '@/modules/client/messaging/chat-permissions.service';
import type { StorageService } from '@/storage/storage.service';

function makeGroup(over: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    title: 'A Group',
    createdAt: new Date('2026-06-01T00:00:00Z'),
    _count: { members: 2 },
    members: [
      {
        user: { id: 'u1', name: 'One', email: 'one@x.com', avatarKey: null },
        joinedAt: new Date('2026-06-01T00:00:00Z'),
      },
      {
        user: { id: 'u2', name: 'Two', email: 'two@x.com', avatarKey: null },
        joinedAt: new Date('2026-06-01T00:00:00Z'),
      },
    ],
    ...over,
  };
}

describe('AdminGroupsService', () => {
  let service: AdminGroupsService;
  let groups: Record<string, ReturnType<typeof vi.fn>>;
  let permissions: { canDirectMessage: ReturnType<typeof vi.fn> };

  const ADMIN = { id: 'a1', email: 'admin@x.com', roleId: 'role1' } as never;

  beforeEach(() => {
    groups = {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(makeGroup()),
      findDetail: vi.fn().mockResolvedValue(makeGroup()),
      update: vi.fn().mockResolvedValue(makeGroup()),
      addMembers: vi.fn().mockResolvedValue(undefined),
      removeMember: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    permissions = { canDirectMessage: vi.fn().mockResolvedValue(true) };

    service = new AdminGroupsService(
      groups as unknown as AdminGroupsRepository,
      { publicUrl: vi.fn((key: string) => `pub:${key}`) } as unknown as StorageService,
      permissions as unknown as ChatPermissionsService,
    );
  });

  it('should reject creating a group when selected users cannot chat with each other', async () => {
    permissions.canDirectMessage.mockResolvedValueOnce(false);

    await expect(service.create(ADMIN, 'Cross Group', ['u1', 'u2'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(groups.create).not.toHaveBeenCalled();
  });

  it('should return every member in group detail (no scoping)', async () => {
    const result = await service.detail('g1');

    expect(result.memberCount).toBe(2);
    expect(result.members).toHaveLength(2);
    expect(result.members.map((m) => m.userId)).toEqual(['u1', 'u2']);
  });

  it('should reject adding a member who cannot chat with the existing roster', async () => {
    permissions.canDirectMessage.mockResolvedValueOnce(false);

    await expect(service.addMembers('g1', ['u3'])).rejects.toBeInstanceOf(BadRequestException);
    expect(groups.addMembers).not.toHaveBeenCalled();
  });
});
