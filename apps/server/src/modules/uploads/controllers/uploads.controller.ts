import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ApiErrorCode, type AttachmentDto } from '@open-meet/types';

import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { SkipTransform } from '@/common/decorators/skip-transform.decorator';
import { StorageService } from '@/storage/services/storage.service';
import { UploadsService } from '@/modules/uploads/services/uploads.service';

const PUBLIC_PREFIX = '/api/uploads/public/';

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  weba: 'audio/webm',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
};

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
    start = Math.max(0, totalSize - Number(rawEnd));

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

function keyFromUrl(url: string): string {
  const idx = url.indexOf(PUBLIC_PREFIX);
  let key = idx >= 0 ? url.slice(idx + PUBLIC_PREFIX.length) : '';

  const query = key.indexOf('?');

  if (query >= 0) {
    key = key.slice(0, query);
  }

  return decodeURIComponent(key);
}

function contentTypeFor(key: string): { mime: string; inline: boolean } {
  const dot = key.lastIndexOf('.');
  const ext = dot >= 0 ? key.slice(dot + 1).toLowerCase() : '';
  const mime = EXT_MIME[ext];

  return mime ? { mime, inline: true } : { mime: 'application/octet-stream', inline: false };
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly storage: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload a chat attachment (multipart/form-data, field "file")' })
  async upload(
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
  ): Promise<AttachmentDto> {
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

    return this.uploads.upload({
      uploaderId: user.id,
      filename: part.filename || 'file',
      buffer,
      mime: part.mimetype || 'application/octet-stream',
    });
  }

  @Get('public/*')
  @Public()
  @SkipThrottle()
  @SkipTransform()
  @ApiOperation({ summary: 'Serve a stored file (avatars, attachments) by key' })
  async serve(
    @Req() req: FastifyRequest,
    @Headers('range') rangeHeader: string | undefined,
    @Res({ passthrough: false }) res: FastifyReply,
  ): Promise<FastifyReply> {
    const key = keyFromUrl(req.url);

    if (!key) {
      throw new NotFoundException({ code: ApiErrorCode.NOT_FOUND, message: 'File not found' });
    }

    const probe = await this.storage.read(key);

    if (!probe) {
      throw new NotFoundException({ code: ApiErrorCode.NOT_FOUND, message: 'File not found' });
    }

    const totalSize = probe.size;
    const { mime, inline } = contentTypeFor(key);
    const filename = key.split('/').pop() || 'file';

    res.header('Content-Type', mime);

    res.header('Accept-Ranges', 'bytes');

    res.header('Cache-Control', 'private, max-age=3600');

    res.header('Cross-Origin-Resource-Policy', 'cross-origin');

    res.header('X-Content-Type-Options', 'nosniff');

    res.header(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
    );

    const parsed = parseRange(rangeHeader, totalSize);

    if (!parsed) {
      probe.stream.destroy();
      const full = await this.storage.read(key);

      if (!full) {
        throw new NotFoundException({ code: ApiErrorCode.NOT_FOUND, message: 'File not found' });
      }

      res.header('Content-Length', String(full.size));

      return res.send(full.stream);
    }

    probe.stream.destroy();
    const slice = await this.storage.readRange(key, parsed);

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
