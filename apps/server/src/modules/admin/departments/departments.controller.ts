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
  AdminDepartmentDetailDto,
  AdminDepartmentDto,
  AdminDepartmentListResponseDto,
} from '@open-meet/types';

import { Public } from '../../../common/decorators/public.decorator';

import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminPermissionsGuard } from '../rbac/admin-permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

import {
  AddDepartmentMembersBodyDto,
  CreateDepartmentBodyDto,
  UpdateDepartmentBodyDto,
} from './dto/department.dto';

import { AdminDepartmentsService } from './departments.service';

@ApiTags('admin-departments')
@Controller('admin/departments')
@UseGuards(AdminAuthGuard, AdminPermissionsGuard)
@Public()
export class AdminDepartmentsController {
  constructor(private readonly departments: AdminDepartmentsService) {}

  @Get()
  @RequirePermissions('departments.view')
  @ApiOperation({ summary: 'List all departments' })
  list(): Promise<AdminDepartmentListResponseDto> {
    return this.departments.list();
  }

  @Post()
  @RequirePermissions('departments.create')
  @ApiOperation({ summary: 'Create a department' })
  create(@Body() dto: CreateDepartmentBodyDto): Promise<AdminDepartmentDto> {
    return this.departments.create(dto);
  }

  @Get(':id')
  @RequirePermissions('departments.view')
  @ApiOperation({ summary: 'Get a department with its members' })
  detail(@Param('id') id: string): Promise<AdminDepartmentDetailDto> {
    return this.departments.detail(id);
  }

  @Patch(':id')
  @RequirePermissions('departments.update')
  @ApiOperation({ summary: 'Update a department' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentBodyDto): Promise<AdminDepartmentDto> {
    return this.departments.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('departments.delete')
  @ApiOperation({ summary: 'Delete a department' })
  remove(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.departments.remove(id);
  }

  @Post(':id/members')
  @RequirePermissions('departments.manage-members')
  @ApiOperation({ summary: 'Add members to a department' })
  addMembers(
    @Param('id') id: string,
    @Body() dto: AddDepartmentMembersBodyDto,
  ): Promise<AdminDepartmentDetailDto> {
    return this.departments.addMembers(id, dto.userIds);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('departments.manage-members')
  @ApiOperation({ summary: 'Remove a member from a department' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<{ removed: true }> {
    return this.departments.removeMember(id, userId);
  }
}
