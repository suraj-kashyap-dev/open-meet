import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ApiErrorCode,
  type AdminChannelDto,
  type AdminChannelListResponseDto,
  type AdminCreateChannelDto,
  type AdminUpdateChannelDto,
} from '@open-meet/types';

import { AdminChannelsRepository, type ChannelRow } from './channels.repository';

@Injectable()
export class AdminChannelsService {
  constructor(private readonly channels: AdminChannelsRepository) {}

  async list(teamId: string): Promise<AdminChannelListResponseDto> {
    const rows = await this.channels.list(teamId);
    return { items: rows.map((c) => this.toDto(c)) };
  }

  async create(
    teamId: string,
    createdByAdminId: string,
    dto: AdminCreateChannelDto,
  ): Promise<AdminChannelDto> {
    const name = dto.name.trim();

    if (name.length === 0) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Channel name is required.',
      });
    }

    // Channel membership mirrors the team's current members.
    const memberIds = await this.channels.teamMemberIds(teamId);
    const channel = await this.channels.create({
      teamId,
      name,
      description: dto.description?.trim() || null,
      isGeneral: false,
      createdByAdminId,
      memberIds,
    });

    return this.toDto(channel);
  }

  async update(channelId: string, dto: AdminUpdateChannelDto): Promise<AdminChannelDto> {
    await this.require(channelId);

    const data: { title?: string; description?: string | null } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length === 0) {
        throw new BadRequestException({
          code: ApiErrorCode.VALIDATION_FAILED,
          message: 'Channel name is required.',
        });
      }
      data.title = name;
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    return this.toDto(await this.channels.update(channelId, data));
  }

  async remove(channelId: string): Promise<{ deleted: true }> {
    const channel = await this.require(channelId);

    if (channel.isGeneral) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'The General channel cannot be deleted.',
      });
    }

    await this.channels.delete(channelId);
    return { deleted: true };
  }

  private async require(channelId: string): Promise<ChannelRow> {
    const channel = await this.channels.findById(channelId);

    if (!channel) {
      throw new NotFoundException({
        code: ApiErrorCode.NOT_FOUND,
        message: 'Channel not found.',
      });
    }

    return channel;
  }

  private toDto(channel: ChannelRow): AdminChannelDto {
    return {
      id: channel.id,
      name: channel.title ?? '',
      description: channel.description,
      isGeneral: channel.isGeneral,
      memberCount: channel._count.members,
      createdAt: channel.createdAt.toISOString(),
    };
  }
}
