import { createHash, randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Admin, type AdminInvite, AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';

import { I18nContext, I18nService } from 'nestjs-i18n';

import type { ApiEnv } from '@open-meet/config';
import {
  type AdminAccountDto,
  type AdminAccountListResponseDto,
  type AdminAcceptInviteDto,
  type AdminCreateInviteDto,
  type AdminInviteDto,
  type AdminInviteListResponseDto,
  type AdminInviteLookupDto,
  AdminInviteStatus,
  type AdminUpdateAccountDto,
  ApiErrorCode,
} from '@open-meet/types';

import { renderEmail } from '../../../integrations/mail/email-layout';
import { MailService } from '../../../integrations/mail/mail.service';

import { AdminRepository } from '../admin.repository';
import { AdminInviteRepository } from './admin-invite.repository';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type InviteWithOptionalInviter = AdminInvite & { invitedBy?: { name: string } | null };

@Injectable()
export class AdminAccountsService {
  private readonly logger = new Logger(AdminAccountsService.name);

  constructor(
    private readonly admins: AdminRepository,
    private readonly invites: AdminInviteRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly i18n: I18nService,
  ) {}

  /** Locale resolved for the current request, falling back to English. */
  private get lang(): string {
    return I18nContext.current()?.lang ?? 'en';
  }

  /** Translate a key in the request's locale. */
  private t(key: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(key, { lang: this.lang, args }) as string;
  }

  async list(): Promise<AdminAccountListResponseDto> {
    const rows = await this.admins.list();
    return { items: rows.map((a) => this.toDto(a)) };
  }

  async listInvites(): Promise<AdminInviteListResponseDto> {
    const rows = await this.invites.listPending();
    return { items: rows.map((i) => this.toInviteDto(i)) };
  }

  async createInvite(actingAdminId: string, dto: AdminCreateInviteDto): Promise<AdminInviteDto> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: this.t('errors.name-required'),
      });
    }

    const existing = await this.admins.findByEmail(email);

    if (existing) {
      throw new ConflictException({
        code: ApiErrorCode.EMAIL_TAKEN,
        message: this.t('errors.email-taken'),
      });
    }

    const { token, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await this.invites.upsertByEmail({
      email,
      name,
      role: dto.role ?? AdminRole.ADMIN,
      tokenHash,
      invitedById: actingAdminId,
      expiresAt,
    });

    await this.sendInviteEmail({ email, name, token, expiresAt });

    return this.toInviteDto(invite);
  }

  async resendInvite(id: string): Promise<AdminInviteDto> {
    const invite = await this.invites.findById(id);

    if (!invite) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: this.t('errors.invite-not-found'),
      });
    }

    const { token, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const updated = await this.invites.refreshToken(id, tokenHash, expiresAt);

    await this.sendInviteEmail({ email: updated.email, name: updated.name, token, expiresAt });

    return this.toInviteDto(updated);
  }

  async revokeInvite(id: string): Promise<{ deleted: true }> {
    const invite = await this.invites.findById(id);

    if (!invite) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: this.t('errors.invite-not-found'),
      });
    }

    await this.invites.delete(id);
    return { deleted: true };
  }

  async lookupInvite(token: string): Promise<AdminInviteLookupDto> {
    const invite = await this.requireValidInvite(token);

    return {
      email: invite.email,
      name: invite.name,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async acceptInvite(dto: AdminAcceptInviteDto): Promise<AdminAccountDto> {
    const invite = await this.requireValidInvite(dto.token);

    const existing = await this.admins.findByEmail(invite.email);

    if (existing) {
      // An admin with this email was created by other means since the invite
      // went out — the invite is moot, so clear it and report the conflict.
      await this.invites.delete(invite.id);
      throw new ConflictException({
        code: ApiErrorCode.EMAIL_TAKEN,
        message: this.t('errors.email-taken'),
      });
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const created = await this.admins.create({
      email: invite.email,
      name: invite.name,
      passwordHash,
      role: invite.role,
    });

    await this.invites.delete(invite.id);

    return this.toDto(created);
  }

  async update(id: string, dto: AdminUpdateAccountDto): Promise<AdminAccountDto> {
    const target = await this.admins.findById(id);

    if (!target) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: this.t('errors.admin-not-found'),
      });
    }

    const data: { name?: string; role?: AdminRole } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (!name) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: this.t('errors.name-empty'),
        });
      }

      data.name = name;
    }

    if (dto.role !== undefined && dto.role !== target.role) {
      if (target.role === AdminRole.SUPERADMIN && dto.role !== AdminRole.SUPERADMIN) {
        const remaining = await this.admins.countByRole(AdminRole.SUPERADMIN);

        if (remaining <= 1) {
          throw new ForbiddenException({
            code: ApiErrorCode.FORBIDDEN,
            message: this.t('errors.cannot-demote-last-superadmin'),
          });
        }
      }

      data.role = dto.role;
    }

    if (Object.keys(data).length === 0) {
      return this.toDto(target);
    }

    const updated = await this.admins.update(id, data);
    return this.toDto(updated);
  }

  async delete(actingAdminId: string, targetId: string): Promise<{ deleted: true }> {
    if (actingAdminId === targetId) {
      throw new ForbiddenException({
        code: ApiErrorCode.FORBIDDEN,
        message: this.t('errors.cannot-delete-self'),
      });
    }

    const target = await this.admins.findById(targetId);

    if (!target) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: this.t('errors.admin-not-found'),
      });
    }

    if (target.role === AdminRole.SUPERADMIN) {
      const remaining = await this.admins.countByRole(AdminRole.SUPERADMIN);

      if (remaining <= 1) {
        throw new ForbiddenException({
          code: ApiErrorCode.FORBIDDEN,
          message: this.t('errors.cannot-delete-last-superadmin'),
        });
      }
    }

    await this.admins.delete(targetId);
    return { deleted: true };
  }

  private async requireValidInvite(token: string): Promise<AdminInvite> {
    const invite = await this.invites.findByTokenHash(this.hashToken(token));

    if (!invite) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: this.t('errors.invite-invalid'),
      });
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: ApiErrorCode.TOKEN_INVALID,
        message: this.t('errors.invite-expired'),
      });
    }

    return invite;
  }

  private generateToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: this.hashToken(token) };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendInviteEmail(input: {
    email: string;
    name: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    const base = this.config.getOrThrow<string>('ADMIN_URL').replace(/\/$/, '');
    const acceptUrl = `${base}/accept-invite?token=${encodeURIComponent(input.token)}`;
    const when = input.expiresAt.toUTCString();

    try {
      await this.mail.send({
        to: input.email,
        subject: this.t('email.invite.subject'),
        text: this.inviteText(input.name, acceptUrl, when),
        html: this.inviteHtml(input.name, acceptUrl, when),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send admin invite to ${input.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new ServiceUnavailableException({
        code: ApiErrorCode.INTERNAL_ERROR,
        message: 'The invite was saved but the email could not be sent — try Resend.',
      });
    }
  }

  private inviteText(name: string, url: string, when: string): string {
    return [
      this.t('email.invite.greeting', { name }),
      '',
      this.t('email.invite.text-intro'),
      this.t('email.invite.text-action'),
      url,
      '',
      this.t('email.invite.text-expires', { when }),
    ].join('\n');
  }

  private inviteHtml(name: string, url: string, when: string): string {
    return renderEmail({
      preview: this.t('email.invite.preview'),
      heading: this.t('email.invite.heading'),
      body: [this.t('email.invite.greeting', { name }), this.t('email.invite.body')],
      button: { label: this.t('email.invite.cta'), url },
      footnote: this.t('email.invite.footnote', { when }),
    });
  }

  private toInviteDto(invite: InviteWithOptionalInviter): AdminInviteDto {
    const expired = invite.expiresAt.getTime() < Date.now();

    return {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      status: expired ? AdminInviteStatus.EXPIRED : AdminInviteStatus.PENDING,
      invitedByName: invite.invitedBy?.name ?? null,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }

  private toDto(admin: Admin): AdminAccountDto {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdAt: admin.createdAt.toISOString(),
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    };
  }
}
