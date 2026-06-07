import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import type { I18nService } from 'nestjs-i18n';

import type { DatagridService } from '@/common/datagrid';
import type { AdminRepository } from '@/modules/admin/repositories/admin.repository';
import type { AdminInviteRepository } from '@/modules/admin/accounts/repositories/admin-invite.repository';
import { AdminAccountsService } from '@/modules/admin/accounts/services/accounts.service';
import type { AdminPermissionResolver } from '@/modules/admin/rbac/services/admin-permission-resolver.service';
import type { AdminRoleRepository } from '@/modules/admin/rbac/repositories/admin-role.repository';
import type { MailService } from '@/integrations/mail/services/mail.service';
import type { StorageService } from '@/storage/services/storage.service';

vi.mock('argon2', () => ({ hash: vi.fn().mockResolvedValue('HASH'), argon2id: 2 }));

const futureDate = (): Date => new Date(Date.now() + 60_000);
const pastDate = (): Date => new Date(Date.now() - 60_000);

const memberRole = {
  id: 'role_sys_member',
  name: 'Member',
  description: null,
  permissionType: 'CUSTOM' as const,
  permissions: [],
  isSystem: true,
  cacheRev: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const adminRole = {
  ...memberRole,
  id: 'role_sys_admin',
  name: 'Administrator',
  permissionType: 'ALL' as const,
};

describe('AdminAccountsService', () => {
  let service: AdminAccountsService;
  let admins: Record<string, ReturnType<typeof vi.fn>>;
  let invites: Record<string, ReturnType<typeof vi.fn>>;
  let mail: { send: ReturnType<typeof vi.fn> };
  let config: { getOrThrow: ReturnType<typeof vi.fn> };
  let i18n: { translate: ReturnType<typeof vi.fn> };
  let storage: { publicUrl: ReturnType<typeof vi.fn> };
  let roles: Record<string, ReturnType<typeof vi.fn>>;
  let resolver: { invalidate: ReturnType<typeof vi.fn> };
  let grid: { build: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    admins = {
      searchWhere: vi.fn().mockReturnValue({ _w: true }),
      listWith: vi.fn().mockResolvedValue([
        {
          id: 'a1',
          email: 'admin@x.com',
          name: 'Admin',
          roleRecordId: 'role_sys_member',
          avatarKey: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastLoginAt: null,
        },
      ]),
      countWith: vi.fn().mockResolvedValue(1),
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      countByRoleRecord: vi.fn().mockResolvedValue(2),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'new',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastLoginAt: null,
          avatarKey: null,
          ...data,
        }),
      ),
      update: vi.fn().mockImplementation((id, data) =>
        Promise.resolve({
          id,
          email: 'old@x.com',
          name: 'Old',
          roleRecordId: 'role_sys_member',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastLoginAt: null,
          avatarKey: null,
          ...data,
        }),
      ),
      updateRoleRecord: vi.fn().mockImplementation((id, roleRecordId) =>
        Promise.resolve({
          id,
          email: 'old@x.com',
          name: 'Old',
          roleRecordId,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastLoginAt: null,
          avatarKey: null,
        }),
      ),
      delete: vi.fn().mockResolvedValue({ id: 'target' }),
    };

    invites = {
      upsertByEmail: vi
        .fn()
        .mockImplementation((data) =>
          Promise.resolve({ id: 'inv1', createdAt: new Date(), updatedAt: new Date(), ...data }),
        ),
      findById: vi.fn().mockResolvedValue(null),
      findByTokenHash: vi.fn().mockResolvedValue(null),
      listPending: vi.fn().mockResolvedValue([]),
      refreshToken: vi.fn().mockImplementation((id, tokenHash, expiresAt) =>
        Promise.resolve({
          id,
          email: 'inv@x.com',
          name: 'Invitee',
          roleRecordId: 'role_sys_member',
          tokenHash,
          expiresAt,
          createdAt: new Date(),
        }),
      ),
      delete: vi.fn().mockResolvedValue({ id: 'inv1' }),
      deleteByEmail: vi.fn().mockResolvedValue(undefined),
    };

    mail = { send: vi.fn().mockResolvedValue(undefined) };
    config = { getOrThrow: vi.fn().mockReturnValue('http://localhost:3001') };
    i18n = { translate: vi.fn((key: string) => key) };
    storage = { publicUrl: vi.fn((key: string) => `https://cdn.example/${key}`) };
    roles = {
      findById: vi
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve(
            id === 'role_sys_admin' ? adminRole : id === 'role_sys_member' ? memberRole : null,
          ),
        ),
    };
    resolver = { invalidate: vi.fn() };
    grid = { build: vi.fn().mockReturnValue({ ok: true }) };

    service = new AdminAccountsService(
      admins as unknown as AdminRepository,
      invites as unknown as AdminInviteRepository,
      mail as unknown as MailService,
      config as unknown as ConfigService<ApiEnv, true>,
      i18n as unknown as I18nService,
      storage as unknown as StorageService,
      roles as unknown as AdminRoleRepository,
      resolver as unknown as AdminPermissionResolver,
      grid as unknown as DatagridService,
    );
  });

  describe('datagrid()', () => {
    it('clamps paging, trims search, builds an allow-listed orderBy, and delegates to grid.build', async () => {
      const res = await service.datagrid({
        page: 2,
        pageSize: 5,
        sort: 'name',
        dir: 'asc',
        search: '  alice ',
      } as never);

      expect(admins.searchWhere).toHaveBeenCalledWith('alice');
      expect(admins.listWith).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        where: { _w: true },
        orderBy: { name: 'asc' },
      });
      expect(admins.countWith).toHaveBeenCalledWith({ _w: true });

      const [def, data] = grid.build.mock.calls[0];
      expect(def.resource).toBe('administrators');
      expect(data.total).toBe(1);
      expect(data.rows[0]).toMatchObject({ id: 'a1', email: 'admin@x.com' });
      expect(res).toEqual({ ok: true });
    });

    it('ignores a non-sortable column and falls back to the default sort', async () => {
      await service.datagrid({ sort: 'role' } as never);
      expect(admins.listWith).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('resolves the role record for each row and maps it into the dto', async () => {
      await service.datagrid({} as never);

      const [, data] = grid.build.mock.calls[0];
      expect(data.rows[0].role).toMatchObject({ id: 'role_sys_member' });
    });
  });

  describe('create()', () => {
    it('should reject a blank name', async () => {
      await expect(
        service.create({ email: 'a@x.com', name: '   ', password: 'password1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject an email that already belongs to an admin', async () => {
      admins.findByEmail.mockResolvedValueOnce({ id: 'dup' });
      await expect(
        service.create({ email: 'a@x.com', name: 'A', password: 'password1' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should normalize the email, default to the Member role, and persist a hashed password', async () => {
      const result = await service.create({
        email: '  A@X.COM ',
        name: '  Jo ',
        password: 'password1',
      });

      expect(admins.create).toHaveBeenCalledWith({
        email: 'a@x.com',
        name: 'Jo',
        passwordHash: 'HASH',
        roleRecordId: 'role_sys_member',
      });
      expect(result.email).toBe('a@x.com');
      expect(result.role?.id).toBe('role_sys_member');
    });

    it('should honor the requested roleId and clear any pending invite for the email', async () => {
      await service.create({
        email: 'a@x.com',
        name: 'Jo',
        password: 'password1',
        roleId: 'role_sys_admin',
      });

      expect(admins.create).toHaveBeenCalledWith(
        expect.objectContaining({ roleRecordId: 'role_sys_admin' }),
      );
      expect(invites.deleteByEmail).toHaveBeenCalledWith('a@x.com');
    });
  });

  describe('createInvite()', () => {
    it('should reject a blank name', async () => {
      await expect(
        service.createInvite('actor', { email: 'a@x.com', name: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject inviting an email that already belongs to an admin', async () => {
      admins.findByEmail.mockResolvedValueOnce({ id: 'dup' });
      await expect(
        service.createInvite('actor', { email: 'a@x.com', name: 'A' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should normalize the email, default to the Member role, and persist a hashed token', async () => {
      await service.createInvite('actor', { email: '  A@X.COM ', name: '  Jo ' });

      expect(invites.upsertByEmail).toHaveBeenCalledTimes(1);
      const arg = invites.upsertByEmail.mock.calls[0][0];
      expect(arg.email).toBe('a@x.com');
      expect(arg.name).toBe('Jo');
      expect(arg.roleRecordId).toBe('role_sys_member');
      expect(arg.invitedById).toBe('actor');
      expect(arg.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(arg.expiresAt).toBeInstanceOf(Date);
    });

    it('should email a link containing the raw token to the invitee', async () => {
      await service.createInvite('actor', {
        email: 'a@x.com',
        name: 'Jo',
        roleId: 'role_sys_admin',
      });

      expect(mail.send).toHaveBeenCalledTimes(1);
      const sent = mail.send.mock.calls[0][0];
      expect(sent.to).toBe('a@x.com');
      expect(sent.html).toContain('http://localhost:3001/accept-invite?token=');
      const stored = invites.upsertByEmail.mock.calls[0][0].tokenHash;
      expect(sent.html).not.toContain(stored);
    });
  });

  describe('acceptInvite()', () => {
    it('should reject an unknown token', async () => {
      await expect(
        service.acceptInvite({ token: 'nope', password: 'password1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject an expired invite', async () => {
      invites.findByTokenHash.mockResolvedValueOnce({
        id: 'inv1',
        email: 'a@x.com',
        name: 'A',
        roleRecordId: 'role_sys_member',
        expiresAt: pastDate(),
      });
      await expect(
        service.acceptInvite({ token: 'raw', password: 'password1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should create the admin from the invite and delete the invite', async () => {
      invites.findByTokenHash.mockResolvedValueOnce({
        id: 'inv1',
        email: 'a@x.com',
        name: 'Ann',
        roleRecordId: 'role_sys_admin',
        expiresAt: futureDate(),
      });

      const result = await service.acceptInvite({ token: 'raw', password: 'password1' });

      expect(admins.create).toHaveBeenCalledWith({
        email: 'a@x.com',
        name: 'Ann',
        passwordHash: 'HASH',
        roleRecordId: 'role_sys_admin',
      });
      expect(invites.delete).toHaveBeenCalledWith('inv1');
      expect(result.email).toBe('a@x.com');
    });

    it('should clear the invite and conflict when the admin already exists', async () => {
      invites.findByTokenHash.mockResolvedValueOnce({
        id: 'inv1',
        email: 'a@x.com',
        name: 'Ann',
        roleRecordId: 'role_sys_member',
        expiresAt: futureDate(),
      });
      admins.findByEmail.mockResolvedValueOnce({ id: 'exists' });

      await expect(
        service.acceptInvite({ token: 'raw', password: 'password1' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(invites.delete).toHaveBeenCalledWith('inv1');
      expect(admins.create).not.toHaveBeenCalled();
    });
  });

  describe('lookupInvite()', () => {
    it('should throw when the token is unknown', async () => {
      await expect(service.lookupInvite('nope')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should return the invitee details for a valid token', async () => {
      invites.findByTokenHash.mockResolvedValueOnce({
        id: 'inv1',
        email: 'a@x.com',
        name: 'Ann',
        roleRecordId: 'role_sys_member',
        expiresAt: futureDate(),
      });
      const result = await service.lookupInvite('raw');
      expect(result).toMatchObject({ email: 'a@x.com', name: 'Ann' });
      expect(result.role?.id).toBe('role_sys_member');
    });
  });

  describe('resendInvite()', () => {
    it('should throw when the invite is missing', async () => {
      await expect(service.resendInvite('inv1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should refresh the token and re-send the email', async () => {
      invites.findById.mockResolvedValueOnce({ id: 'inv1', email: 'a@x.com', name: 'A' });
      await service.resendInvite('inv1');
      expect(invites.refreshToken).toHaveBeenCalledTimes(1);
      expect(mail.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('update()', () => {
    it('should throw when the target admin is missing', async () => {
      await expect(service.update('a1', { name: 'New' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should refuse to demote the last remaining Administrator-role admin', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a1', roleRecordId: 'role_sys_admin' });
      admins.countByRoleRecord.mockResolvedValueOnce(1);
      await expect(service.update('a1', { roleId: 'role_sys_member' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should update name and reassign role on a valid change', async () => {
      admins.findById.mockResolvedValueOnce({
        id: 'a1',
        name: 'Old',
        roleRecordId: 'role_sys_member',
      });
      await service.update('a1', { name: '  New  ', roleId: 'role_sys_admin' });
      expect(admins.update).toHaveBeenCalledWith('a1', { name: 'New' });
      expect(admins.updateRoleRecord).toHaveBeenCalledWith('a1', 'role_sys_admin');
    });
  });

  describe('delete()', () => {
    it('should refuse self-deletion', async () => {
      await expect(service.delete('a1', 'a1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw when the target admin is missing', async () => {
      admins.findById.mockResolvedValueOnce(null);
      await expect(service.delete('a1', 'a2')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should refuse to remove the last remaining Administrator-role admin', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a2', roleRecordId: 'role_sys_admin' });
      admins.countByRoleRecord.mockResolvedValueOnce(1);
      await expect(service.delete('a1', 'a2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should remove a regular Member admin', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a2', roleRecordId: 'role_sys_member' });
      await expect(service.delete('a1', 'a2')).resolves.toEqual({ deleted: true });
      expect(admins.delete).toHaveBeenCalledWith('a2');
    });
  });
});
