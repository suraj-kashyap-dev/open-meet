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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type {
  AdminAccountDto,
  AdminAccountListResponseDto,
  AdminInviteDto,
  AdminInviteListResponseDto,
} from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { type AdminRequestUser } from '../auth/strategies/admin-jwt.strategy';

import { AdminAccountsService } from './accounts.service';
import { CreateAdminAccountDto } from './dto/create-account.dto';
import { CreateAdminInviteDto } from './dto/create-invite.dto';
import { UpdateAdminAccountDto } from './dto/update-account.dto';

@ApiTags('admin-accounts')
@Controller('admin/accounts')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminAccountsController {
  constructor(private readonly accounts: AdminAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List every admin account' })
  list(): Promise<AdminAccountListResponseDto> {
    return this.accounts.list();
  }

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create an admin account directly with a password (superadmin only)' })
  create(@Body() dto: CreateAdminAccountDto): Promise<AdminAccountDto> {
    return this.accounts.create(dto);
  }

  @Get('invites')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'List pending admin invites (superadmin only)' })
  listInvites(): Promise<AdminInviteListResponseDto> {
    return this.accounts.listInvites();
  }

  @Post('invites')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Invite a new admin by email (superadmin only)' })
  createInvite(
    @CurrentAdmin() admin: AdminRequestUser,
    @Body() dto: CreateAdminInviteDto,
  ): Promise<AdminInviteDto> {
    return this.accounts.createInvite(admin.id, dto);
  }

  @Post('invites/:id/resend')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Re-send an invite email with a fresh link (superadmin only)' })
  resendInvite(@Param('id') id: string): Promise<AdminInviteDto> {
    return this.accounts.resendInvite(id);
  }

  @Delete('invites/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Revoke a pending invite (superadmin only)' })
  revokeInvite(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.accounts.revokeInvite(id);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: "Update an admin's name or role (superadmin only)" })
  update(@Param('id') id: string, @Body() dto: UpdateAdminAccountDto): Promise<AdminAccountDto> {
    return this.accounts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Delete an admin (cannot delete self or last superadmin)' })
  remove(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminRequestUser,
  ): Promise<{ deleted: true }> {
    return this.accounts.delete(admin.id, id);
  }
}
