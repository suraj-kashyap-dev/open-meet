import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminGroupsService } from '@/modules/admin/groups/groups.service';
import type { AdminGroupsRepository } from '@/modules/admin/groups/groups.repository';
import type { DatagridService } from '@/common/datagrid';
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
  let grid: { build: ReturnType<typeof vi.fn> };

  const ADMIN = { id: 'a1', email: 'admin@x.com', roleId: 'role1' } as never;

  beforeEach(() => {
    groups = {
      list: vi.fn().mockResolvedValue([]),
      searchWhere: vi.fn().mockReturnValue({ _w: true }),
      listWith: vi.fn().mockResolvedValue([makeGroup()]),
      countWith: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue(makeGroup()),
      findDetail: vi.fn().mockResolvedValue(makeGroup()),
      update: vi.fn().mockResolvedValue(makeGroup()),
      addMembers: vi.fn().mockResolvedValue(undefined),
      removeMember: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    permissions = { canDirectMessage: vi.fn().mockResolvedValue(true) };
    grid = { build: vi.fn().mockReturnValue({ ok: true }) };

    service = new AdminGroupsService(
      groups as unknown as AdminGroupsRepository,
      { publicUrl: vi.fn((key: string) => `pub:${key}`) } as unknown as StorageService,
      permissions as unknown as ChatPermissionsService,
      grid as unknown as DatagridService,
    );
  });

  describe('datagrid()', () => {
    it('clamps paging, trims search, builds an allow-listed orderBy, and maps rows to the grid', async () => {
      const res = await service.datagrid({
        page: 2,
        pageSize: 10,
        sort: 'name',
        dir: 'asc',
        search: '  team ',
      } as never);

      expect(groups.searchWhere).toHaveBeenCalledWith('team');
      expect(groups.listWith).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        where: { _w: true },
        orderBy: { title: 'asc' },
      });
      expect(groups.countWith).toHaveBeenCalledWith({ _w: true });

      const [def, data] = grid.build.mock.calls[0];
      expect(def.resource).toBe('groups');
      expect(data.total).toBe(1);
      expect(res).toEqual({ ok: true });
    });

    it('ignores a non-sortable column and falls back to the default sort', async () => {
      await service.datagrid({ sort: 'actions' } as never);
      expect(groups.listWith).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
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
