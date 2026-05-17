import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AdminUserDto, AdminUserListResponseDto } from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminListUsersQueryDto } from './dto/list-users-query.dto';
import { AdminUpdateUserBodyDto } from './dto/update-user.dto';
import { AdminUsersService } from './users.service';

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(AdminAuthGuard)
@Public()
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated list of users with optional search' })
  list(@Query() query: AdminListUsersQueryDto): Promise<AdminUserListResponseDto> {
    return this.users.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by id' })
  getOne(@Param('id') id: string): Promise<AdminUserDto> {
    return this.users.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() dto: AdminUpdateUserBodyDto): Promise<AdminUserDto> {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.users.delete(id);
  }
}
