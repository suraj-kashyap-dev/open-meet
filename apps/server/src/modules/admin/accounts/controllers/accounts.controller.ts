import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  AdminAccountDto,
  AdminInviteDto,
  AdminInviteListResponseDto,
  DatagridResponseDto,
} from '@open-meet/types';

import { Public } from '../../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { CurrentAdmin } from '../../auth/decorators/current-admin.decorator';
import { type AdminRequestUser } from '../../auth/strategies/admin-jwt.strategy';
import { AdminPermissionsGuard } from '../../rbac/admin-permissions.guard';
import { RequirePermissions } from '../../rbac/decorators/require-permissions.decorator';

import { AssignRoleBodyDto } from '../../rbac/dto/role.dto';

import { AdminAccountsService } from '../services/accounts.service';
import { AdminAccountsDatagridQueryDto } from '../dto/accounts-datagrid-query.dto';
import { CreateAdminAccountDto } from '../dto/create-account.dto';
import { CreateAdminInviteDto } from '../dto/create-invite.dto';
import { UpdateAdminAccountDto } from '../dto/update-account.dto';

@ApiTags('admin-accounts')
@Controller('admin/accounts')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminAccountsController {
  constructor(private readonly accounts: AdminAccountsService) {}

  @Get('datagrid')
  @RequirePermissions('admin-accounts.view')
  @ApiOperation({ summary: 'Server-driven datagrid (schema + rows) for administrators' })
  datagrid(
    @Query() q: AdminAccountsDatagridQueryDto,
  ): Promise<DatagridResponseDto<AdminAccountDto>> {
    return this.accounts.datagrid(q);
  }

  @Post()
  @RequirePermissions('admin-accounts.create')
  @ApiOperation({ summary: 'Create an admin account directly with a password' })
  create(@Body() dto: CreateAdminAccountDto): Promise<AdminAccountDto> {
    return this.accounts.create(dto);
  }

  @Get('invites')
  @RequirePermissions('admin-accounts.view')
  @ApiOperation({ summary: 'List pending admin invites' })
  listInvites(): Promise<AdminInviteListResponseDto> {
    return this.accounts.listInvites();
  }

  @Post('invites')
  @RequirePermissions('admin-accounts.invite')
  @ApiOperation({ summary: 'Invite a new admin by email' })
  createInvite(
    @CurrentAdmin() admin: AdminRequestUser,
    @Body() dto: CreateAdminInviteDto,
  ): Promise<AdminInviteDto> {
    return this.accounts.createInvite(admin.id, dto);
  }

  @Post('invites/:id/resend')
  @RequirePermissions('admin-accounts.invite')
  @ApiOperation({ summary: 'Re-send an invite email with a fresh link' })
  resendInvite(@Param('id') id: string): Promise<AdminInviteDto> {
    return this.accounts.resendInvite(id);
  }

  @Delete('invites/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('admin-accounts.invite')
  @ApiOperation({ summary: 'Revoke a pending invite' })
  revokeInvite(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.accounts.revokeInvite(id);
  }

  @Patch(':id')
  @RequirePermissions('admin-accounts.update')
  @ApiOperation({ summary: "Update an admin's name or role" })
  update(@Param('id') id: string, @Body() dto: UpdateAdminAccountDto): Promise<AdminAccountDto> {
    return this.accounts.update(id, dto);
  }

  @Patch(':id/role')
  @RequirePermissions('admin-accounts.update', 'roles.assign')
  @ApiOperation({ summary: 'Assign an RBAC role to an admin (re-login required to apply)' })
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleBodyDto): Promise<AdminAccountDto> {
    return this.accounts.assignRole(id, dto.roleId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('admin-accounts.delete')
  @ApiOperation({ summary: 'Delete an admin (cannot delete self or last superadmin)' })
  remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminRequestUser,
  ): Promise<{ deleted: true }> {
    return this.accounts.delete(admin.id, id);
  }
}
