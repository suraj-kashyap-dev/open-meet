import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiEnv } from '@open-meet/config';

import type { I18nService } from 'nestjs-i18n';

import type { AdminRepository } from '@/modules/admin/admin.repository';
import type { AdminInviteRepository } from '@/modules/admin/accounts/admin-invite.repository';
import { AdminAccountsService } from '@/modules/admin/accounts/accounts.service';
import type { MailService } from '@/integrations/mail/mail.service';

vi.mock('argon2', () => ({ hash: vi.fn().mockResolvedValue('HASH'), argon2id: 2 }));

const futureDate = (): Date => new Date(Date.now() + 60_000);
const pastDate = (): Date => new Date(Date.now() - 60_000);

describe('AdminAccountsService', () => {
  let service: AdminAccountsService;
  let admins: Record<string, ReturnType<typeof vi.fn>>;
  let invites: Record<string, ReturnType<typeof vi.fn>>;
  let mail: { send: ReturnType<typeof vi.fn> };
  let config: { getOrThrow: ReturnType<typeof vi.fn> };
  let i18n: { translate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    admins = {
      list: vi.fn().mockResolvedValue([]),
      findByEmail: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      countByRole: vi.fn().mockResolvedValue(2),
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'new',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastLoginAt: null,
          ...data,
        }),
      ),
      update: vi.fn().mockImplementation((id, data) =>
        Promise.resolve({
          id,
          email: 'old@x.com',
          name: 'Old',
          role: AdminRole.ADMIN,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          lastLoginAt: null,
          ...data,
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
          role: AdminRole.ADMIN,
          tokenHash,
          expiresAt,
          createdAt: new Date(),
        }),
      ),
      delete: vi.fn().mockResolvedValue({ id: 'inv1' }),
    };

    mail = { send: vi.fn().mockResolvedValue(undefined) };
    config = { getOrThrow: vi.fn().mockReturnValue('http://localhost:3001') };
    i18n = { translate: vi.fn((key: string) => key) };

    service = new AdminAccountsService(
      admins as unknown as AdminRepository,
      invites as unknown as AdminInviteRepository,
      mail as unknown as MailService,
      config as unknown as ConfigService<ApiEnv, true>,
      i18n as unknown as I18nService,
    );
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

    it('should normalize the email, default the role to ADMIN, and persist a hashed token', async () => {
      await service.createInvite('actor', { email: '  A@X.COM ', name: '  Jo ' });

      expect(invites.upsertByEmail).toHaveBeenCalledTimes(1);
      const arg = invites.upsertByEmail.mock.calls[0][0];
      expect(arg.email).toBe('a@x.com');
      expect(arg.name).toBe('Jo');
      expect(arg.role).toBe(AdminRole.ADMIN);
      expect(arg.invitedById).toBe('actor');
      expect(arg.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(arg.expiresAt).toBeInstanceOf(Date);
    });

    it('should email a link containing the raw token to the invitee', async () => {
      await service.createInvite('actor', {
        email: 'a@x.com',
        name: 'Jo',
        role: AdminRole.SUPERADMIN,
      });

      expect(mail.send).toHaveBeenCalledTimes(1);
      const sent = mail.send.mock.calls[0][0];
      expect(sent.to).toBe('a@x.com');
      expect(sent.html).toContain('http://localhost:3001/accept-invite?token=');
      // The stored hash must NOT be the raw token that is emailed.
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
        role: AdminRole.ADMIN,
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
        role: AdminRole.SUPERADMIN,
        expiresAt: futureDate(),
      });

      const result = await service.acceptInvite({ token: 'raw', password: 'password1' });

      expect(admins.create).toHaveBeenCalledWith({
        email: 'a@x.com',
        name: 'Ann',
        passwordHash: 'HASH',
        role: AdminRole.SUPERADMIN,
      });
      expect(invites.delete).toHaveBeenCalledWith('inv1');
      expect(result.email).toBe('a@x.com');
    });

    it('should clear the invite and conflict when the admin already exists', async () => {
      invites.findByTokenHash.mockResolvedValueOnce({
        id: 'inv1',
        email: 'a@x.com',
        name: 'Ann',
        role: AdminRole.ADMIN,
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
        role: AdminRole.ADMIN,
        expiresAt: futureDate(),
      });
      const result = await service.lookupInvite('raw');
      expect(result).toMatchObject({ email: 'a@x.com', name: 'Ann', role: AdminRole.ADMIN });
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

    it('should refuse to demote the last remaining superadmin', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a1', role: AdminRole.SUPERADMIN });
      admins.countByRole.mockResolvedValueOnce(1);
      await expect(service.update('a1', { role: AdminRole.ADMIN })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should update name and role for a valid change', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a1', name: 'Old', role: AdminRole.ADMIN });
      await service.update('a1', { name: '  New  ', role: AdminRole.SUPERADMIN });
      expect(admins.update).toHaveBeenCalledWith('a1', {
        name: 'New',
        role: AdminRole.SUPERADMIN,
      });
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

    it('should refuse to remove the last remaining superadmin', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a2', role: AdminRole.SUPERADMIN });
      admins.countByRole.mockResolvedValueOnce(1);
      await expect(service.delete('a1', 'a2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should remove a regular admin', async () => {
      admins.findById.mockResolvedValueOnce({ id: 'a2', role: AdminRole.ADMIN });
      await expect(service.delete('a1', 'a2')).resolves.toEqual({ deleted: true });
      expect(admins.delete).toHaveBeenCalledWith('a2');
    });
  });
});
