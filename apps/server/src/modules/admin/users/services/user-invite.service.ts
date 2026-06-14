import { createHash, randomBytes } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApiEnv } from '@open-meet/config';
import {
  ApiErrorCode,
  UserInviteStatus,
  type UserInviteDto,
  type UserInviteListResponseDto,
} from '@open-meet/types';

import { renderEmail } from '@/integrations/mail/email-layout';
import { MailService } from '@/integrations/mail/services/mail.service';

import type { UserInvite } from '@prisma/client';

import { AdminUserInviteRepository } from '@/modules/admin/users/repositories/user-invite.repository';

@Injectable()
export class AdminUserInviteService {
  private readonly logger = new Logger(AdminUserInviteService.name);
  private readonly ttlMs: number;

  constructor(
    private readonly invites: AdminUserInviteRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService<ApiEnv, true>,
  ) {
    this.ttlMs = this.config.getOrThrow<number>('USER_INVITE_TTL_HOURS') * 60 * 60 * 1000;
  }

  async list(): Promise<UserInviteListResponseDto> {
    const rows = await this.invites.listPending();

    return { items: rows.map((i) => this.toDto(i)) };
  }

  async create(
    actingAdminId: string,
    input: { email: string; name: string },
  ): Promise<UserInviteDto> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (await this.invites.userExistsByEmail(email)) {
      throw new ConflictException({
        code: ApiErrorCode.EMAIL_TAKEN,
        message: 'An account with this email already exists.',
      });
    }

    const { token, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + this.ttlMs);

    const invite = await this.invites.upsertByEmail({
      email,
      name,
      tokenHash,
      invitedById: actingAdminId,
      expiresAt,
    });

    await this.sendInviteEmail({ email, name, token, expiresAt });

    return this.toDto(invite);
  }

  async resend(id: string): Promise<UserInviteDto> {
    const invite = await this.invites.findById(id);

    if (!invite) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Invite not found.',
      });
    }

    const { token, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + this.ttlMs);
    const updated = await this.invites.refreshToken(id, tokenHash, expiresAt);

    await this.sendInviteEmail({ email: updated.email, name: updated.name, token, expiresAt });

    return this.toDto(updated);
  }

  async revoke(id: string): Promise<{ deleted: true }> {
    const invite = await this.invites.findById(id);

    if (!invite) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Invite not found.',
      });
    }

    await this.invites.delete(id);

    return { deleted: true };
  }

  private generateToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');

    return { token, tokenHash: createHash('sha256').update(token).digest('hex') };
  }

  private async sendInviteEmail(input: {
    email: string;
    name: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    const base = this.config.getOrThrow<string>('FRONTEND_URL').replace(/\/$/, '');
    const acceptUrl = `${base}/accept-invite?token=${encodeURIComponent(input.token)}`;
    const when = input.expiresAt.toUTCString();

    try {
      await this.mail.send({
        to: input.email,
        subject: "You've been invited",
        text: [
          `Hi ${input.name},`,
          '',
          "You've been invited to join the workspace. Open the link below to set your password and get started:",
          acceptUrl,
          '',
          `This invitation expires on ${when}.`,
        ].join('\n'),
        html: renderEmail({
          preview: "You've been invited to join the workspace",
          heading: 'Join the workspace',
          body: [
            `Hi ${input.name},`,
            "You've been invited to join the workspace. Set your password to activate your account.",
          ],
          button: { label: 'Accept invitation', url: acceptUrl },
          footnote: `This invitation expires on ${when}.`,
        }),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send user invite to ${input.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: 'The invite was saved but the email could not be sent - try Resend.',
      });
    }
  }

  private toDto(invite: UserInvite & { invitedBy?: { name: string } | null }): UserInviteDto {
    const expired = invite.expiresAt.getTime() < Date.now();

    return {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      status: expired ? UserInviteStatus.EXPIRED : UserInviteStatus.PENDING,
      invitedByName: invite.invitedBy?.name ?? null,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }
}
