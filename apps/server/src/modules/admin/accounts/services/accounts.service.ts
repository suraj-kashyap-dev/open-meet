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
import type { Admin, AdminInvite, AdminRoleRecord, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';

import { I18nContext, I18nService } from 'nestjs-i18n';

import type { ApiEnv } from '@open-meet/config';
import {
  type AdminAccountDto,
  type AdminAcceptInviteDto,
  type AdminCreateAccountDto,
  type AdminCreateInviteDto,
  type AdminInviteDto,
  type AdminInviteListResponseDto,
  type AdminInviteLookupDto,
  AdminInviteStatus,
  type AdminUpdateAccountDto,
  type DatagridResponseDto,
  ApiErrorCode,
} from '@open-meet/types';

import { DatagridService, buildOrderBy, paginate } from '@/common/datagrid';
import { renderEmail } from '@/integrations/mail/email-layout';
import { MailService } from '@/integrations/mail/services/mail.service';
import { StorageService } from '@/storage/services/storage.service';

import { AdminRepository } from '@/modules/admin/core/repositories/admin.repository';
import { AdminPermissionResolver } from '@/modules/admin/rbac/services/admin-permission-resolver.service';
import { AdminRoleRepository } from '@/modules/admin/rbac/repositories/admin-role.repository';
import {
  SYSTEM_ADMIN_ROLE_ID,
  SYSTEM_MEMBER_ROLE_ID,
} from '@/modules/admin/rbac/services/admin-rbac-seed.service';
import {
  AdminInviteRepository,
  type AdminInviteWithInviter,
} from '@/modules/admin/accounts/repositories/admin-invite.repository';
import { ADMINISTRATORS_DATAGRID } from '@/modules/admin/accounts/accounts.datagrid';
import { AdminAccountsDatagridQueryDto } from '@/modules/admin/accounts/dto/accounts-datagrid-query.dto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AdminAccountsService {
  private readonly logger = new Logger(AdminAccountsService.name);

  constructor(
    private readonly admins: AdminRepository,
    private readonly invites: AdminInviteRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService<ApiEnv, true>,
    private readonly i18n: I18nService,
    private readonly storage: StorageService,
    private readonly roles: AdminRoleRepository,
    private readonly resolver: AdminPermissionResolver,
    private readonly grid: DatagridService,
  ) {}

  private get lang(): string {
    return I18nContext.current()?.lang ?? 'en';
  }

  private t(key: string, args?: Record<string, unknown>): string {
    return this.i18n.translate(key, { lang: this.lang, args }) as string;
  }

  async datagrid(
    query: AdminAccountsDatagridQueryDto,
  ): Promise<DatagridResponseDto<AdminAccountDto>> {
    const { skip, take } = paginate(query);
    const search = query.search?.trim() || undefined;
    const where = this.admins.searchWhere(search);
    const orderBy = buildOrderBy(
      ADMINISTRATORS_DATAGRID,
      query,
    ) as Prisma.AdminOrderByWithRelationInput;

    const [rows, total] = await Promise.all([
      this.admins.listWith({ skip, take, where, orderBy }),
      this.admins.countWith(where),
    ]);

    const roleIds = Array.from(
      new Set(rows.map((r) => r.roleRecordId).filter((id): id is string => Boolean(id))),
    );
    const roleList = await Promise.all(roleIds.map((id) => this.roles.findById(id)));
    const byId = new Map(
      roleList.filter((r): r is AdminRoleRecord => Boolean(r)).map((r) => [r.id, r]),
    );

    return this.grid.build(ADMINISTRATORS_DATAGRID, {
      rows: rows.map((a) =>
        this.toDto(a, a.roleRecordId ? (byId.get(a.roleRecordId) ?? null) : null),
      ),
      total,
      query,
    });
  }

  async listInvites(): Promise<AdminInviteListResponseDto> {
    const rows = await this.invites.listPending();

    return { items: rows.map((i) => this.toInviteDto(i)) };
  }

  async create(dto: AdminCreateAccountDto): Promise<AdminAccountDto> {
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

    const roleId = await this.resolveRoleIdOrDefault(dto.roleId);
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const created = await this.admins.create({
      email,
      name,
      passwordHash,
      roleRecordId: roleId,
    });

    await this.invites.deleteByEmail(email);

    const role = await this.roles.findById(roleId);

    return this.toDto(created, role);
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

    const roleId = await this.resolveRoleIdOrDefault(dto.roleId);
    const { token, tokenHash } = this.generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await this.invites.upsertByEmail({
      email,
      name,
      roleRecordId: roleId,
      tokenHash,
      invitedById: actingAdminId,
      expiresAt,
    });

    await this.sendInviteEmail({ email, name, token, expiresAt });

    const role = await this.roles.findById(roleId);

    return this.toInviteDto({
      ...invite,
      invitedBy: null,
      roleRecord: role
        ? { id: role.id, name: role.name, permissionType: role.permissionType }
        : null,
    });
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

    const role = updated.roleRecordId ? await this.roles.findById(updated.roleRecordId) : null;

    return this.toInviteDto({
      ...updated,
      invitedBy: null,
      roleRecord: role
        ? { id: role.id, name: role.name, permissionType: role.permissionType }
        : null,
    });
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
    const role = invite.roleRecordId ? await this.roles.findById(invite.roleRecordId) : null;

    return {
      email: invite.email,
      name: invite.name,
      role: role ? { id: role.id, name: role.name, permissionType: role.permissionType } : null,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async acceptInvite(dto: AdminAcceptInviteDto): Promise<AdminAccountDto> {
    const invite = await this.requireValidInvite(dto.token);

    const existing = await this.admins.findByEmail(invite.email);

    if (existing) {
      await this.invites.delete(invite.id);
      throw new ConflictException({
        code: ApiErrorCode.EMAIL_TAKEN,
        message: this.t('errors.email-taken'),
      });
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const roleId = invite.roleRecordId ?? SYSTEM_MEMBER_ROLE_ID;
    const created = await this.admins.create({
      email: invite.email,
      name: invite.name,
      passwordHash,
      roleRecordId: roleId,
    });

    await this.invites.delete(invite.id);

    const role = await this.roles.findById(roleId);

    return this.toDto(created, role);
  }

  async update(id: string, dto: AdminUpdateAccountDto): Promise<AdminAccountDto> {
    const target = await this.admins.findById(id);

    if (!target) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: this.t('errors.admin-not-found'),
      });
    }

    const data: { name?: string } = {};

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

    let updated: Admin = target;

    if (Object.keys(data).length > 0) {
      updated = await this.admins.update(id, data);
    }

    if (dto.roleId !== undefined && dto.roleId !== target.roleRecordId) {
      if (target.roleRecordId === SYSTEM_ADMIN_ROLE_ID && dto.roleId !== SYSTEM_ADMIN_ROLE_ID) {
        const remaining = await this.admins.countByRoleRecord(SYSTEM_ADMIN_ROLE_ID);

        if (remaining <= 1) {
          throw new ForbiddenException({
            code: ApiErrorCode.FORBIDDEN,
            message: this.t('errors.cannot-demote-last-superadmin'),
          });
        }
      }

      updated = await this.assignRoleInternal(id, dto.roleId);
    }

    const role = updated.roleRecordId ? await this.roles.findById(updated.roleRecordId) : null;

    return this.toDto(updated, role);
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

    if (target.roleRecordId === SYSTEM_ADMIN_ROLE_ID) {
      const remaining = await this.admins.countByRoleRecord(SYSTEM_ADMIN_ROLE_ID);

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

  async assignRole(targetId: string, roleId: string): Promise<AdminAccountDto> {
    const target = await this.admins.findById(targetId);

    if (!target) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: this.t('errors.admin-not-found'),
      });
    }

    if (target.roleRecordId === SYSTEM_ADMIN_ROLE_ID && roleId !== SYSTEM_ADMIN_ROLE_ID) {
      const remaining = await this.admins.countByRoleRecord(SYSTEM_ADMIN_ROLE_ID);

      if (remaining <= 1) {
        throw new ForbiddenException({
          code: ApiErrorCode.FORBIDDEN,
          message: this.t('errors.cannot-demote-last-superadmin'),
        });
      }
    }

    const updated = await this.assignRoleInternal(targetId, roleId);
    const role = updated.roleRecordId ? await this.roles.findById(updated.roleRecordId) : null;

    return this.toDto(updated, role);
  }

  private async assignRoleInternal(adminId: string, roleId: string): Promise<Admin> {
    const role = await this.roles.findById(roleId);

    if (!role) {
      throw new NotFoundException({
        code: ApiErrorCode.ROLE_NOT_FOUND,
        message: this.t('errors.role-not-found'),
      });
    }

    const updated = await this.admins.updateRoleRecord(adminId, roleId);

    this.resolver.invalidate(roleId);

    return updated;
  }

  private async resolveRoleIdOrDefault(roleId: string | undefined): Promise<string> {
    if (!roleId) {
      return SYSTEM_MEMBER_ROLE_ID;
    }

    const role = await this.roles.findById(roleId);

    if (!role) {
      throw new NotFoundException({
        code: ApiErrorCode.ROLE_NOT_FOUND,
        message: this.t('errors.role-not-found'),
      });
    }

    return role.id;
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
        message: 'The invite was saved but the email could not be sent - try Resend.',
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

  private toInviteDto(invite: AdminInviteWithInviter): AdminInviteDto {
    const expired = invite.expiresAt.getTime() < Date.now();

    return {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      role: invite.roleRecord ?? null,
      status: expired ? AdminInviteStatus.EXPIRED : AdminInviteStatus.PENDING,
      invitedByName: invite.invitedBy?.name ?? null,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }

  private toDto(admin: Admin, role: AdminRoleRecord | null): AdminAccountDto {
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: role ? { id: role.id, name: role.name, permissionType: role.permissionType } : null,
      avatar: admin.avatarKey ? this.storage.publicUrl(admin.avatarKey) : null,
      createdAt: admin.createdAt.toISOString(),
      lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    };
  }
}
