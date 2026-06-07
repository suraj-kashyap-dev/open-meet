import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

import type { RecordingDto } from '@open-meet/types';
import { ApiErrorCode } from '@open-meet/types';

import {
  CurrentUser,
  type RequestUser,
} from '../../../../common/decorators/current-user.decorator';
import { SkipTransform } from '../../../../common/decorators/skip-transform.decorator';
import { StorageService } from '../../../../storage/services/storage.service';
import { RecordingEvents } from '../recording.events';
import { RecordingService } from '../services/recording.service';

const RANGE_REGEX = /^bytes=(\d*)-(\d*)$/;

function parseRange(
  header: string | undefined,
  totalSize: number,
): { start: number; end: number } | null {
  if (!header) {
    return null;
  }

  const match = RANGE_REGEX.exec(header.trim());

  if (!match) {
    return null;
  }

  const [, rawStart, rawEnd] = match;
  const hasStart = rawStart !== '';
  const hasEnd = rawEnd !== '';

  if (!hasStart && !hasEnd) {
    return null;
  }

  let start: number;
  let end: number;

  if (!hasStart) {
    const suffix = Number(rawEnd);
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  } else if (!hasEnd) {
    start = Number(rawStart);
    end = totalSize - 1;
  } else {
    start = Number(rawStart);
    end = Number(rawEnd);
  }

  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
    return null;
  }

  return { start, end: Math.min(end, totalSize - 1) };
}

@ApiTags('recording')
@Controller()
export class RecordingController {
  constructor(
    private readonly service: RecordingService,
    private readonly events: RecordingEvents,
    private readonly storage: StorageService,
  ) {}

  @Post('meetings/:code/recording/start')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'code' })
  @ApiOperation({ summary: 'Start recording the meeting (host only)' })
  async start(
    @Param('code') code: string,
    @CurrentUser() user: RequestUser,
  ): Promise<RecordingDto> {
    const dto = await this.service.start(code, user.id);

    this.events.emitStarted(code, dto);

    return dto;
  }

  @Post('meetings/:code/recording/stop')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'code' })
  @ApiOperation({ summary: 'Stop the active recording (host only)' })
  async stop(@Param('code') code: string, @CurrentUser() user: RequestUser): Promise<RecordingDto> {
    return this.service.stop(code, user.id);
  }

  @Get('meetings/:code/recording/active')
  @ApiParam({ name: 'code' })
  @ApiOperation({ summary: 'Get the currently active recording, if any' })
  async active(
    @Param('code') code: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ active: boolean; recording: RecordingDto | null }> {
    const recording = await this.service.getActive(code, user.id);

    return { active: recording !== null, recording };
  }

  @Get('meetings/:code/recordings')
  @ApiParam({ name: 'code' })
  @ApiOperation({ summary: 'List recordings for a meeting (participants only)' })
  async list(
    @Param('code') code: string,
    @CurrentUser() user: RequestUser,
  ): Promise<RecordingDto[]> {
    return this.service.listForMeeting(code, user.id);
  }

  @Get('recordings/:id/stream')
  @SkipTransform()
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Stream a completed recording (participants only)' })
  async stream(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Headers('range') rangeHeader: string | undefined,
    @Query('download') download: string | undefined,
    @Res({ passthrough: false }) res: FastifyReply,
  ): Promise<FastifyReply> {
    const { recording, storageKey } = await this.service.getStreamFor(id, user.id);

    const probe = await this.storage.read(storageKey);

    if (!probe) {
      throw new NotFoundException({
        code: ApiErrorCode.RECORDING_NOT_FOUND,
        message: 'Recording file is missing on disk',
      });
    }

    const mime = recording.mime || 'video/mp4';
    const totalSize = probe.size;
    const filename = storageKey.split('/').pop() || `recording-${recording.id}.mp4`;
    const disposition = download === '1' ? 'attachment' : 'inline';

    res.header('Content-Type', mime);
    res.header('Accept-Ranges', 'bytes');
    res.header('Cache-Control', 'private, max-age=3600');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Content-Disposition', `${disposition}; filename="${filename}"`);

    const parsed = parseRange(rangeHeader, totalSize);

    if (!parsed) {
      probe.stream.destroy();
      const full = await this.storage.read(storageKey);

      if (!full) {
        throw new NotFoundException({
          code: ApiErrorCode.RECORDING_NOT_FOUND,
          message: 'Recording file is missing on disk',
        });
      }

      res.header('Content-Length', String(full.size));
      return res.send(full.stream);
    }

    probe.stream.destroy();
    const slice = await this.storage.readRange(storageKey, parsed);

    if (!slice) {
      res.status(416);
      res.header('Content-Range', `bytes */${totalSize}`);
      return res.send('Requested range not satisfiable');
    }

    res.status(206);
    res.header('Content-Length', String(slice.size));
    res.header('Content-Range', `bytes ${slice.start}-${slice.end}/${slice.totalSize}`);
    return res.send(slice.stream);
  }
}
