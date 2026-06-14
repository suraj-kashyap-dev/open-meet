import {
  BadRequestException,
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import type {
  AdminUserDto,
  AdminUserListResponseDto,
  DatagridResponseDto,
  UserInviteDto,
  UserInviteListResponseDto,
} from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import { Public } from '@/common/decorators/public.decorator';

import { CurrentAdmin } from '@/modules/admin/auth/decorators/current-admin.decorator';
import { AdminAuthGuard } from '@/modules/admin/auth/guards/admin-auth.guard';
import { type AdminRequestUser } from '@/modules/admin/auth/strategies/admin-jwt.strategy';
import { AdminPermissionsGuard } from '@/modules/admin/rbac/admin-permissions.guard';
import { RequirePermissions } from '@/modules/admin/rbac/decorators/require-permissions.decorator';
import { AdminListUsersQueryDto } from '@/modules/admin/users/dto/list-users-query.dto';
import { AdminUsersDatagridQueryDto } from '@/modules/admin/users/dto/users-datagrid-query.dto';
import { AdminCreateUserBodyDto } from '@/modules/admin/users/dto/create-user.dto';
import { CreateUserInviteBodyDto } from '@/modules/admin/users/dto/create-user-invite.dto';
import { AdminUpdateUserBodyDto } from '@/modules/admin/users/dto/update-user.dto';
import { AdminUserInviteService } from '@/modules/admin/users/services/user-invite.service';
import { AdminUsersService } from '@/modules/admin/users/services/users.service';

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminUsersController {
  constructor(
    private readonly users: AdminUsersService,
    private readonly userInvites: AdminUserInviteService,
  ) {}

  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Paginated list of users with optional search' })
  list(@Query() query: AdminListUsersQueryDto): Promise<AdminUserListResponseDto> {
    return this.users.list(query);
  }

  @Get('datagrid')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Server-driven datagrid (schema + rows) for users' })
  datagrid(@Query() query: AdminUsersDatagridQueryDto): Promise<DatagridResponseDto<AdminUserDto>> {
    return this.users.datagrid(query);
  }

  @Get('invites')
  @RequirePermissions('users.invite')
  @ApiOperation({ summary: 'List pending user invites' })
  listInvites(): Promise<UserInviteListResponseDto> {
    return this.userInvites.list();
  }

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create a new active user with an admin-set password' })
  create(@Body() dto: AdminCreateUserBodyDto): Promise<AdminUserDto> {
    return this.users.create(dto);
  }

  @Post('invite')
  @RequirePermissions('users.invite')
  @ApiOperation({ summary: 'Invite a new user by email' })
  invite(
    @CurrentAdmin() admin: AdminRequestUser,
    @Body() dto: CreateUserInviteBodyDto,
  ): Promise<UserInviteDto> {
    return this.userInvites.create(admin.id, dto);
  }

  @Post('invites/:id/resend')
  @RequirePermissions('users.invite')
  @ApiOperation({ summary: 'Re-send a user invite with a fresh link' })
  resendInvite(@Param('id') id: string): Promise<UserInviteDto> {
    return this.userInvites.resend(id);
  }

  @Delete('invites/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.invite')
  @ApiOperation({ summary: 'Revoke a pending user invite' })
  revokeInvite(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.userInvites.revoke(id);
  }

  @Get(':id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get a single user by id' })
  getOne(@Param('id') id: string): Promise<AdminUserDto> {
    return this.users.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() dto: AdminUpdateUserBodyDto): Promise<AdminUserDto> {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.users.delete(id);
  }

  @Post(':id/avatar')
  @RequirePermissions('users.manage-avatar')
  @ApiOperation({ summary: "Upload (or replace) a user's profile image" })
  async uploadAvatar(@Param('id') id: string, @Req() req: FastifyRequest): Promise<AdminUserDto> {
    if (!req.isMultipart()) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Expected multipart/form-data',
      });
    }

    const part = await req.file();

    if (!part) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'No file provided',
      });
    }

    const buffer = await part.toBuffer();

    return this.users.uploadAvatar(id, buffer, part.mimetype || 'application/octet-stream');
  }

  @Delete(':id/avatar')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.manage-avatar')
  @ApiOperation({ summary: "Remove a user's avatar" })
  removeAvatar(@Param('id') id: string): Promise<AdminUserDto> {
    return this.users.removeAvatar(id);
  }
}
