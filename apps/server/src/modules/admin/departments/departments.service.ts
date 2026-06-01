import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ApiErrorCode,
  type AdminDepartmentDetailDto,
  type AdminDepartmentDto,
  type AdminDepartmentListResponseDto,
  type AdminDepartmentMemberDto,
} from '@open-meet/types';

import { StorageService } from '../../../storage/storage.service';

import {
  AdminDepartmentsRepository,
  type DepartmentMemberWithUser,
  type DepartmentWithCount,
} from './departments.repository';
import type { CreateDepartmentBodyDto, UpdateDepartmentBodyDto } from './dto/department.dto';

@Injectable()
export class AdminDepartmentsService {
  constructor(
    private readonly departments: AdminDepartmentsRepository,
    private readonly storage: StorageService,
  ) {}

  async list(): Promise<AdminDepartmentListResponseDto> {
    const rows = await this.departments.list();
    return { items: rows.map((t) => this.toDto(t)) };
  }

  async create(input: CreateDepartmentBodyDto): Promise<AdminDepartmentDto> {
    const name = input.name.trim();

    if (name.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Department name is required.',
      });
    }

    const responsibleAdminId = this.normalizeNullable(input.responsibleAdminId);
    if (responsibleAdminId) await this.ensureAdminExists(responsibleAdminId);

    const department = await this.departments.create({
      name,
      description: this.normalizeNullable(input.description),
      responsibleAdminId,
    });
    return this.toDto(department);
  }

  async detail(id: string): Promise<AdminDepartmentDetailDto> {
    const department = await this.require(id);
    const members = await this.departments.members(id);

    return { ...this.toDto(department), members: members.map((m) => this.toMemberDto(m)) };
  }

  async update(id: string, input: UpdateDepartmentBodyDto): Promise<AdminDepartmentDto> {
    await this.require(id);

    const data: { name?: string; description?: string | null; responsibleAdminId?: string | null } =
      {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name.length === 0) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Department name is required.',
        });
      }
      data.name = name;
    }
    if (input.description !== undefined) {
      data.description = this.normalizeNullable(input.description);
    }
    if (input.responsibleAdminId !== undefined) {
      const responsibleAdminId = this.normalizeNullable(input.responsibleAdminId);
      if (responsibleAdminId) await this.ensureAdminExists(responsibleAdminId);
      data.responsibleAdminId = responsibleAdminId;
    }

    if (Object.keys(data).length === 0) {
      return this.toDto(await this.require(id));
    }

    return this.toDto(await this.departments.update(id, data));
  }

  async remove(id: string): Promise<{ deleted: true }> {
    await this.require(id);
    await this.departments.delete(id);
    return { deleted: true };
  }

  async addMembers(id: string, userIds: string[]): Promise<AdminDepartmentDetailDto> {
    await this.require(id);
    const unique = [...new Set(userIds)];
    await this.departments.addMembers(id, unique);
    return this.detail(id);
  }

  async removeMember(id: string, userId: string): Promise<{ removed: true }> {
    await this.require(id);
    await this.departments.removeMember(id, userId);
    return { removed: true };
  }

  private async require(id: string): Promise<DepartmentWithCount> {
    const department = await this.departments.findWithCount(id);

    if (!department) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Department not found.',
      });
    }

    return department;
  }

  private async ensureAdminExists(id: string): Promise<void> {
    if (!(await this.departments.adminExists(id))) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Selected responsible admin does not exist.',
      });
    }
  }

  private normalizeNullable(raw: string | null | undefined): string | null {
    if (raw === null || raw === undefined) return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toDto(department: DepartmentWithCount): AdminDepartmentDto {
    return {
      id: department.id,
      name: department.name,
      description: department.description,
      responsibleAdminId: department.responsibleAdminId,
      responsibleAdminName: department.responsibleAdmin?.name ?? null,
      memberCount: department._count.members,
      createdAt: department.createdAt.toISOString(),
    };
  }

  private toMemberDto(member: DepartmentMemberWithUser): AdminDepartmentMemberDto {
    return {
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatarKey ? this.storage.publicUrl(member.user.avatarKey) : null,
      joinedAt: member.joinedAt.toISOString(),
    };
  }
}
