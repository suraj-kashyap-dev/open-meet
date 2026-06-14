import { Injectable } from '@nestjs/common';
import { type Recording, RecordingStatus } from '@prisma/client';

import { PrismaService } from '@/database/services/prisma.service';

@Injectable()
export class RecordingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    meetingId: string;
    egressId: string;
    startedById: string;
    storageKey: string;
  }): Promise<Recording> {
    return this.prisma.recording.create({
      data: {
        meetingId: data.meetingId,
        egressId: data.egressId,
        startedById: data.startedById,
        storageKey: data.storageKey,
        status: RecordingStatus.RECORDING,
      },
    });
  }

  findById(id: string): Promise<Recording | null> {
    return this.prisma.recording.findUnique({ where: { id } });
  }

  findByEgressId(egressId: string): Promise<Recording | null> {
    return this.prisma.recording.findUnique({ where: { egressId } });
  }

  findActiveForMeeting(meetingId: string): Promise<Recording | null> {
    return this.prisma.recording.findFirst({
      where: {
        meetingId,
        status: { in: [RecordingStatus.RECORDING, RecordingStatus.STOPPING] },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  findRecordingForMeeting(meetingId: string): Promise<Recording | null> {
    return this.prisma.recording.findFirst({
      where: {
        meetingId,
        status: RecordingStatus.RECORDING,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  listForMeeting(meetingId: string): Promise<Recording[]> {
    return this.prisma.recording.findMany({
      where: { meetingId },
      orderBy: { startedAt: 'desc' },
    });
  }

  countCompletedByMeetingIds(meetingIds: string[]): Promise<Map<string, number>> {
    if (meetingIds.length === 0) {
      return Promise.resolve(new Map());
    }

    return this.prisma.recording
      .groupBy({
        by: ['meetingId'],
        where: {
          meetingId: { in: meetingIds },
          status: RecordingStatus.COMPLETED,
        },
        _count: { _all: true },
      })
      .then(
        (rows: Array<{ meetingId: string; _count: { _all: number } }>) =>
          new Map(rows.map((r) => [r.meetingId, r._count._all])),
      );
  }

  markStopping(id: string): Promise<Recording> {
    return this.prisma.recording.update({
      where: { id },
      data: { status: RecordingStatus.STOPPING },
    });
  }

  markCompleted(
    egressId: string,
    data: { durationMs: number; sizeBytes: bigint; url: string | null; endedAt: Date },
  ): Promise<Recording> {
    return this.prisma.recording.update({
      where: { egressId },
      data: {
        status: RecordingStatus.COMPLETED,
        duration: data.durationMs,
        size: data.sizeBytes,
        url: data.url,
        endedAt: data.endedAt,
        error: null,
      },
    });
  }

  markFailed(
    egressId: string,
    data: { error: string; durationMs?: number; sizeBytes?: bigint; endedAt: Date },
  ): Promise<Recording> {
    return this.prisma.recording.update({
      where: { egressId },
      data: {
        status: RecordingStatus.FAILED,
        error: data.error,
        duration: data.durationMs ?? 0,
        size: data.sizeBytes ?? BigInt(0),
        endedAt: data.endedAt,
      },
    });
  }

  findStarterName(userId: string): Promise<{ name: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
  }
}
