import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminUserInviteService } from '@/modules/admin/users/user-invite.service';
import type { AdminUserInviteRepository } from '@/modules/admin/users/user-invite.repository';
import type { MailService } from '@/integrations/mail/mail.service';

describe('AdminUserInviteService', () => {
  let service: AdminUserInviteService;
  let invites: Record<string, ReturnType<typeof vi.fn>>;
  let mail: { send: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    invites = {
      listPending: vi.fn().mockResolvedValue([
        {
          id: 'i1',
          email: 'one@x.com',
          name: 'One',
          tokenHash: 'hash1',
          invitedById: 'a1',
          expiresAt: new Date(Date.now() + 60_000),
          createdAt: new Date('2026-06-01T00:00:00Z'),
          invitedBy: { name: 'Admin' },
        },
        {
          id: 'i2',
          email: 'two@x.com',
          name: 'Two',
          tokenHash: 'hash2',
          invitedById: 'a1',
          expiresAt: new Date(Date.now() + 60_000),
          createdAt: new Date('2026-06-01T00:00:00Z'),
          invitedBy: { name: 'Admin' },
        },
      ]),
      findById: vi.fn().mockResolvedValue({
        id: 'i1',
        email: 'one@x.com',
        name: 'One',
        tokenHash: 'hash1',
        invitedById: 'a1',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date('2026-06-01T00:00:00Z'),
      }),
      refreshToken: vi.fn().mockResolvedValue({
        id: 'i1',
        email: 'one@x.com',
        name: 'One',
        tokenHash: 'hash1',
        invitedById: 'a1',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date('2026-06-01T00:00:00Z'),
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      userExistsByEmail: vi.fn().mockResolvedValue(false),
      upsertByEmail: vi.fn().mockResolvedValue({
        id: 'i1',
        email: 'one@x.com',
        name: 'One',
        tokenHash: 'hash1',
        invitedById: 'a1',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date('2026-06-01T00:00:00Z'),
      }),
    };
    mail = { send: vi.fn().mockResolvedValue(undefined) };

    service = new AdminUserInviteService(
      invites as unknown as AdminUserInviteRepository,
      mail as unknown as MailService,
      {
        getOrThrow: vi.fn((key: string) =>
          key === 'FRONTEND_URL' ? 'https://app.example.com' : 24,
        ),
      } as never,
    );
  });

  it('should list every pending invite', async () => {
    const res = await service.list();
    expect(res.items).toHaveLength(2);
    expect(res.items.map((i) => i.email)).toEqual(['one@x.com', 'two@x.com']);
  });

  it('should create an invite and send the email', async () => {
    const res = await service.create('a1', { email: 'New@x.com', name: 'New' });
    expect(invites.upsertByEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@x.com', name: 'New', invitedById: 'a1' }),
    );
    expect(mail.send).toHaveBeenCalled();
    expect(res.email).toBe('one@x.com');
  });

  it('should reject creating an invite for an existing account', async () => {
    invites.userExistsByEmail.mockResolvedValueOnce(true);
    await expect(service.create('a1', { email: 'one@x.com', name: 'One' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('should throw when resending a missing invite', async () => {
    invites.findById.mockResolvedValueOnce(null);
    await expect(service.resend('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw when revoking a missing invite', async () => {
    invites.findById.mockResolvedValueOnce(null);
    await expect(service.revoke('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should revoke an existing invite', async () => {
    await expect(service.revoke('i1')).resolves.toEqual({ deleted: true });
    expect(invites.delete).toHaveBeenCalledWith('i1');
  });
});
